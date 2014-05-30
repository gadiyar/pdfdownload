/***** BEGIN LICENSE BLOCK *****
   - Version: MPL 1.1/GPL 2.0/LGPL 2.1
   -
   - The contents of this file are subject to the Mozilla Public License Version
   - 1.1 (the "License"); you may not use this file except in compliance with
   - the License. You may obtain a copy of the License at
   - http://www.mozilla.org/MPL/
   -
   - Software distributed under the License is distributed on an "AS IS" basis,
   - WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
   - for the specific language governing rights and limitations under the
   - License.
   -
   - The Original Code is "PDF Download".
   -
   - The Initial Developer of the Original Code is Denis Remondini.
   - Portions created by the Initial Developer are Copyright (C) 2005-2007 Denis Remondini.  
   - All Rights Reserved.
   -
   - Contributor(s): Denis Remondini <denistn AT gmail DOT com>
   -
   - Alternatively, the contents of this file may be used under the terms of
   - either the GNU General Public License Version 2 or later (the "GPL"), or
   - the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
   - in which case the provisions of the GPL or the LGPL are applicable instead
   - of those above. If you wish to allow use of your version of this file only
   - under the terms of either the GPL or the LGPL, and not to allow others to
   - use your version of this file under the terms of the MPL, indicate your
   - decision by deleting the provisions above and replace them with the notice
   - and other provisions required by the LGPL or the GPL. If you do not delete
   - the provisions above, a recipient may use your version of this file under
   - the terms of any one of the MPL, the GPL or the LGPL.
   -
 ***** END LICENSE BLOCK *****/


var bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                          .getService(Components.interfaces.nsIStringBundleService);
var bundle = bundleService.createBundle("chrome://pdfdownload/locale/pdfdownload.properties");
var sltPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefBranch);
const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
var fileCID  = '@mozilla.org/file/local;1';
var fileIID  = Components.interfaces.nsILocalFile;
const focusNewTabPref = "browser.tabs.loadInBackground";

var downloadQueue = new Array();

function getCurrentLocation() {
	return document.commandDispatcher.focusedWindow.location.href;
}

//find the base URL for the document
function getBaseUrl() {
	var dir = getCurrentLocation();
	var baseTag = window._content.document.getElementsByTagName('base')[0];
	if (baseTag != null) {
		if ((baseTag.href != null) && (baseTag.href != "")) {
			dir = baseTag.href;
		}
	}
	return dir;
}


//save the linked file 
function savelink(url) {
	saveURL(url, null, null, true, true, null);	
}

//handle the click event
function mouseClick(aEvent) {

	var globalHistory = Components.classes["@mozilla.org/browser/global-history;2"]
	                                       .getService(Components.interfaces.nsIBrowserHistory);

	if (!aEvent)
		return;

	// if right click, we do not do anything
	if (aEvent.button == 2)
		return;

	// if Shift key and Ctrl key were pressed, it means that the user wants to open the PDF file without "PDF Download"
	if (aEvent.shiftKey && aEvent.ctrlKey) 
		return;

	if (aEvent.target)
		var targ = aEvent.originalTarget;

	/* BEGIN of the code taken by an extension written by Ben Basson (Cusser)  */
	if (targ.tagName.toUpperCase() != "A")
	{
		// Recurse until reaching root node
		while (targ.parentNode) 
		{
			targ = targ.parentNode;
			// stop if an anchor is located
			if (targ.tagName && targ.tagName.toUpperCase() == "A")
				break;
		}
		if (!targ.tagName || targ.tagName.toUpperCase() != "A")
			return;
	}
	/* END of the code taken by an extension written by Ben Basson (Cusser) */

	var url = targ.getAttribute("href");	
	if (url == null) return;

	// we check if the link is absolute or not
	if ( (!isLinkType("http", url)) && (!isLinkType("file:",url)) && (!isLinkType("ftp",url)) ) {
		// the link is not absolute, hence we need to build the absolute link
		var dir = getBaseUrl();
		dir = dir.substring(0,dir.lastIndexOf('/')+1);
		var pos = url.indexOf('/');
		if (pos == 0) {
			pos = dir.indexOf('/');
			pos = dir.indexOf('/',pos+1);
			pos = dir.indexOf('/',pos+1);
			url = dir.substr(0,pos) + url;
		} else {
			url = dir + url;
		}
	} 

	// if it is a javascript link, we do not do anything
	if (url.indexOf('javascript:') != -1)
		return;

	//retrieve the url from a google link
	if ((url.match(/^http:\/\/[a-z.]+google.[a-z.]+\/url\?/i)) && (url.match(/[\\?&]url=([^&#]+)/i))) {
		url = decodeURIComponent(RegExp.$1);
	}

	var originalUrl = url;
	// we remove eventual parameters in the url    
	var firstSharpPosition = url.indexOf('#');  
	if (firstSharpPosition != -1) {
		url = url.substring(0,firstSharpPosition);
	} 
	var firstQuestionMarkPosition = url.indexOf('?');  
	if (firstQuestionMarkPosition != -1) {
		url = url.substring(0,firstQuestionMarkPosition);
	} 

	// we check if the link points to a pdf or pdf.gz file
	var lastDotPosition = url.lastIndexOf('.');
	var ext = url.substring(lastDotPosition + 1,lastDotPosition + 3);

	// we check if the extension is part of a directory name or if it is a real filename extension
	var lastSlashPosition = url.lastIndexOf('/');
	if (lastSlashPosition > lastDotPosition) {	
		// the extension we found is not the filename extension but it is part of a directory name
		// ex: http://groups.google.com/group/comp.text.pdf/browse_thread/thread/a7e39729ab3bc5d/9d9408322b2a77ff
		return;
	}
	if (ext.toLowerCase() == "gz") {
		ext = url.substring(lastDotPosition-3,lastDotPosition+3);
		url = url.substring(0, lastDotPosition+3);
	} else {
		ext = url.substring(lastDotPosition + 1, lastDotPosition + 4);
		url = url.substring(0, lastDotPosition + 4);
	}
	if ( (ext.toLowerCase() == "pdf") || (ext.toLowerCase() == "pdf.gz") ) {
		var answer = new Object();
		answer.res = "cancel";
		answer.url = originalUrl;
		answer.filesize = "unknown";
		try {
			answer.res = sltPrefs.getCharPref("extensions.pdfdownload.defaultAction");
		} catch(ex) {
			answer.res = "showPopup";
		}
        handlePDF(answer,ext,url);
        if (answer.res != "cancel") {
			// we set the pdf link as a visited link!!
			var referrer = makeURL(getCurrentLocation());
			var gURIFixer = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(Components.interfaces.nsIURIFixup);
			var visitedURI = gURIFixer.createFixupURI(targ.href, 0)
			markLinkVisited(visitedURI.spec, targ, referrer);
		}
		if (answer.res != "openWithoutExtension") {
			aEvent.preventDefault();
			aEvent.stopPropagation();	
		}
	}
}

function handlePDF(params,ext,normalizedUrl) {
    	if ((params.res == "showPopup") || 
			((params.res == "openHtml") && ((params.url.indexOf("//localhost") != -1) || (params.url.indexOf("//127.0.0.1") != -1)))) {
			window.openDialog("chrome://pdfdownload/content/questionBox.xul", "PDF Download", "chrome,modal,centerscreen,dialog,resizable",params,ext);
		} 
        var isLocalFile = isLinkType("file:",params.url);
        var fname = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
		var openPDF = "";
		if (params.res == "download") {
            if (isLocalFile) {
                var localTarget = buildLocalTarget(fname);
                if (localTarget != null) {
			        copyFile(params.url,localTarget.path);
                }
            } else {
                savelink(params.url);
            }
		} else if (params.res == "open") {
			// we check how to open the PDF
			try {
				openPDF = sltPrefs.getCharPref("extensions.pdfdownload.openPDF");
			} catch(ex) {
				openPDF = "";
			}
            if (!isLocalFile) {	
    			if (openPDF == "usePlugin") {
    				openPDFWithPlugin(params.url);
    			} else {
    				// In the preferences there was written to open the PDF file using a PDF viewer (default or custom).
    				saveTempFile(params.url,fname);	
    			}
            } else {
    			var file = getFileFromUrl(params.url);
    			if (openPDF == "usePlugin") {
    				openPDFWithPlugin(file.path);
    			} else {
    				openPDFExternally(file.path);
    			}
		    }
		} else if (params.res == "openHtml") {
            if (isLocalFile) {
                // since we are dealing with a local file, we cannot use the "View as HTML" option
                params.res = "showPopup";
                handlePDF(params,ext,normalizedUrl);
            } else {
			    getMirror(encodeURIComponent(params.url),params.filesize);
            }
		}
}

function openPDFWithPlugin(url) {
    /*
	 * In the preferences there was written to open the PDF file using the PDF plugin.
	 * Now we check in which tab/window we must open the PDF file using the PDF plugin.
	 */		
	var prefvalue;
	try {
		prefvalue = sltPrefs.getCharPref("extensions.pdfdownload.openPDFLink");
	} catch(ex) {
		prefvalue = "openPDFNewTab";
	}
	if (prefvalue == "openPDFNewTab") {
		var tab = getBrowser().addTab(url);
		if (shouldNewTabFocused()) {
			getBrowser().selectedTab = tab;
		}
	} else if (prefvalue == "openPDFNewWindow") {
		openNewWindowWith(url, null, null);
	} else {
		getBrowser().loadURI(url);
	}     
}

//function taken from old contentAreaUtils.js and fixed up a little bit 
//to support Firefox 1.5
function markLinkVisited(href, linkNode,referrer)
{
	var globalHistory = Components.classes["@mozilla.org/browser/global-history;2"]
	                                       .getService(Components.interfaces.nsIGlobalHistory2);

	var uri = makeURL(href);
	if (!globalHistory.isVisited(uri)) {
		globalHistory.addURI(uri, false, true,referrer);
		var oldHref = linkNode.getAttribute("href");
		if (typeof oldHref == "string") {
			// Use setAttribute instead of direct assignment.
			// (bug 217195, bug 187195)
			linkNode.setAttribute("href", "");
			linkNode.setAttribute("href", oldHref);
		}
	}
}

function buildLocalTarget(fileName) {
	var file  = Components.classes[fileCID].createInstance(fileIID);
	var useDownloadDir = sltPrefs.getBoolPref("browser.download.useDownloadDir");
	if (useDownloadDir == true) {
		var folderList = sltPrefs.getIntPref('browser.download.folderList');
		if (folderList == 0) {
			var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
			var dir = fileLocator.get("Desk", fileIID);
			var localTarget = dir.clone();
			localTarget.append(fileName);	
			return localTarget;			
		} else {
			var downloadDir = sltPrefs.getCharPref('browser.download.dir');
			if (downloadDir) {
				file.initWithPath(downloadDir);
				file.append(fileName);
				return file;
			}
		}
	}	

	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"]
      	  .createInstance(nsIFilePicker);
	fp.init(window, "", nsIFilePicker.modeSave);
    fp.defaultString = fileName;
	appendFiltersForContentType(fp, "application/pdf", "pdf", SAVEMODE_FILEONLY);
	var res = fp.show();
	if (res == Components.interfaces.nsIFilePicker.returnOK) {
	    file.initWithPath(getNormalizedLeafName(fp.file.path,"pdf"));
          //file.append(fileName);
	    return file;
      } 

	return null;
}

function makeURL(aURL)
{
	var ioService = Components.classes["@mozilla.org/network/io-service;1"]
	                                   .getService(Components.interfaces.nsIIOService);
	return ioService.newURI(aURL, null, null);
} 

function makeFileURL(aFile) {
	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	return ioService.newFileURI(aFile);
} 

function getFileFromUrl(url) {
 	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  	var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
	return fileHandler.getFileFromURLSpec(url).QueryInterface(Components.interfaces.nsILocalFile);
}



function copyFile(sourceFile,destFile) {

  	var aDest = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
  	if (!aDest) return false;

  	aFile = getFileFromUrl(sourceFile);
  	aDest.initWithPath(destFile);

  	var newFileName = aDest.leafName;
  	var localTarget = aDest.clone();
  	aDest.initWithPath(destFile.substring(0,destFile.lastIndexOf(aDest.leafName)));

  	var i = 0;
  	while (localTarget.exists()) {
		i++;
		localTarget = null;
		localTarget = aDest.clone();
		localTarget.append(this.createNumber(i) + "_" + newFileName);
  	}
  	aFile.copyTo(aDest,localTarget.leafName);
 }
 

//we find which mirror is better to use to do the PDF->HTML conversion
function getMirror(url,filesize) {
	var http;
	try {
		http = new XMLHttpRequest();
	} catch (e) {
		http = false
	}
	if (http) {
		// this is the server-side script that handle the mirror list
		var uri = "http://www.rabotat.org/firefox/pdfdownload/getmirror.php?filesize="+filesize;
		http.open("GET", uri, true);
		http.onreadystatechange=function() {
			if (http.readyState == 4) {
				if (http.status == 200) {
					if (http.responseText != "") {
						var mirror = http.responseText;
						var pdf2htmlUrl = mirror+"?url="+url;
						const preferencesService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");
						var prefvalue;
						var htmlWithImages = false;
						try {
							prefvalue = preferencesService.getCharPref("openPDFtoHTML");
							htmlWithImages = preferencesService.getBoolPref("showImagesInHTML");
						} catch(ex) {
							prefvalue = "openHTMLNewTab";
							htmlWithImage = false;
						}
						if (htmlWithImages) {
							pdf2htmlUrl = pdf2htmlUrl + "&images=yes";
						}
						if (prefvalue == "openHTMLNewTab") {
							var tab = getBrowser().addTab(pdf2htmlUrl);
							if (shouldNewTabFocused()) {
								getBrowser().selectedTab = tab;
							}
						} else if (prefvalue == "openHTMLNewWindow") {
							openNewWindowWith(pdf2htmlUrl, null, null);
						} else {
							getBrowser().loadURI(pdf2htmlUrl); // Just do a normal load.
						}
					}
				}
			}
		}	
		http.send(null);
	}
}

//save the file in a temporary directory
function saveTempFile(url,fname) {
	// Local File Target
    var todayDir = "pdfdownload-"+pdfDownloadShared.getTodayDate();
	var localTarget = pdfDownloadShared.getPDFDownloadTempDir();
    localTarget.append(todayDir);
    if (!localTarget.exists()) {
        localTarget.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
    }
    var dir = localTarget.clone();
	localTarget.append(fname);
	var i = 0;
	while (localTarget.exists()) {
		i++;
		localTarget = null;
		localTarget = dir.clone();
		localTarget.append(createNumber(i) + "_" + fname);
	}

	var uri = Components.classes["@mozilla.org/network/standard-url;1"]
	                             .createInstance(Components.interfaces.nsIURI);
	uri.spec = url;

	var referer = Components.classes["@mozilla.org/network/standard-url;1"]
	                             .createInstance(Components.interfaces.nsIURI);
	referer.spec = getCurrentLocation();

	downloadQueue[downloadQueue.length] = localTarget.path;

	var progressPersist = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);

	var flags = nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION | nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
	progressPersist.persistFlags = flags;

	var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);
	tr.init(uri,makeFileURI(localTarget), "", null, null, null, progressPersist);
	progressPersist.progressListener = tr;

	progressPersist.saveURI(uri, null, referer, null, null, localTarget);

}

//Opens the pdf file with an external program (the os default one or the one specified by the user under the PDF Download options)
function openPDFExternally(filename) {
	var oFile 	= Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
	oFile.initWithPath(filename);
	if (oFile != null && oFile.exists()) {
		var pdfViewerPath = "";
		var openPDF = "";
		// we check how to open the PDF
		try {
			openPDF = sltPrefs.getCharPref("extensions.pdfdownload.openPDF");
			pdfViewerPath = sltPrefs.getCharPref("extensions.pdfdownload.pdfViewerPath");
		} catch(ex) {
			pdfViewerPath = "";
		}
		if (openPDF == "defaultViewer") {
			// In the preferences there was written to open PDF files using the default viewer
			try {
				oFile.launch();
			} catch (e) {
				try {
					openExternal(oFile);
				} catch (ex) {
					/*
					 * PDF Download has not been able to find a default viewer, so now we ask to the user to choose a custom viewer.
					 */
					window.openDialog("chrome://pdfdownload/content/osWarning.xul","pdfdownload-OS-warning-window","centerscreen,chrome,modal");
					showPDFDownloadSettings();
					try {
						openPDF = sltPrefs.getCharPref("extensions.pdfdownload.openPDF");
						pdfViewerPath = sltPrefs.getCharPref("extensions.pdfdownload.pdfViewerPath");
					} catch(ex) {
						openPDF = "defaultViewer";
					}
				}
			}
		} 
		if (openPDF == "customViewer") {
			// In the preferences there was written to open PDF files using a custom viewer
			var absoluteFileName = pdfDownloadShared.resolveFileName(pdfViewerPath);
			
			if (absoluteFileName != null) {
				oFile.initWithPath(absoluteFileName);
				// create an nsIProcess
				var process = Components.classes["@mozilla.org/process/util;1"]
				                                 .createInstance(Components.interfaces.nsIProcess);
				process.init(oFile);
	
				// Run the process.
				// If first param is true, calling process will be blocked until
				// called process terminates. 
				// Second and third params are used to pass command-line arguments
				// to the process.
				var args = [filename];
				process.run(false, args, args.length);
			}
			else {
				alert(bundle.GetStringFromName("openPDFError"));
			}
		}
	} else {
		alert(bundle.GetStringFromName("openPDFError"));
	}
}

function openExternal(aFile)
{
   var uri = Components.classes["@mozilla.org/network/io-service;1"]
                       .getService(Components.interfaces.nsIIOService)
                       .newFileURI(aFile);
 
   var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
					.getService(Components.interfaces.nsIExternalProtocolService);
 
   protocolSvc.loadUrl(uri);
   return;
}

//Checks the type of a link
function isLinkType (linktype, link) {
	try {
		var protocol = link.substr(0, linktype.length);
		return protocol.toLowerCase() == linktype;
	} catch(e) {
		return false;
	}
}

//Builds a three char string representing the specified number
function createNumber(number) {
	var Stringa;
	if (number <= 9) { 
		Stringa = "00" + number;
	} else if (number <= 99 && number >= 10) { 
		Stringa = "0" + number;
	} else {
		Stringa = number;
	}
	return Stringa;
}

//shows the options dialog for PDF Download
function showPDFDownloadSettings() {
	var features;
	try {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                               .getService(Components.interfaces.nsIPrefBranch);
		var instantApply = prefs.getBoolPref("browser.preferences.instantApply");
		features = "chrome,titlebar,toolbar,centerscreen" + (instantApply ? ",dialog=no" : ",modal");
	}
	catch (e) {
		features = "chrome,titlebar,toolbar,centerscreen,modal";
	}
	var settingsHandle = window.openDialog("chrome://pdfdownload/content/options.xul", "",features);
	settingsHandle.focus();
}

function shouldNewTabFocused() {
	var focusNewTab;
	try {
		focusNewTab = !sltPrefs.getBoolPref(focusNewTabPref);
	} catch(ex) {
		focusNewTab = false;
	}
	return focusNewTab;
}

function togglePDFDownloadItem() {
	if (!sltPrefs.prefHasUserValue("extensions.pdfdownload.showToolsMenuItem")) {
		sltPrefs.setBoolPref("extensions.pdfdownload.showToolsMenuItem",true);
	}
	if (sltPrefs.getBoolPref("extensions.pdfdownload.showToolsMenuItem") == true) {
		document.getElementById("PDFDownloadToolsItem").hidden = false;
	} else {
		document.getElementById("PDFDownloadToolsItem").hidden = true;
	}
}

function retrieveLegacyOptions() {
	const oldPrefix = "pdfdownload.";
	const newPrefix = "extensions.pdfdownload.";
	var prefValue;

	if (sltPrefs.prefHasUserValue(oldPrefix+"openPDF")) {
		prefValue = sltPrefs.getCharPref(oldPrefix+"openPDF");
		if (prefValue != "") { 
			sltPrefs.setCharPref(newPrefix+"openPDF",prefValue);
			sltPrefs.setCharPref(oldPrefix+"openPDF","");
		}		
	} else if (!sltPrefs.prefHasUserValue(newPrefix+"openPDF")) {
		sltPrefs.setCharPref(newPrefix+"openPDF","defaultViewer");	
	}
	if (sltPrefs.prefHasUserValue(oldPrefix+"openPDFLink")) {
		prefValue = sltPrefs.getCharPref(oldPrefix+"openPDFLink");
		if (prefValue != "") { 
			sltPrefs.setCharPref(newPrefix+"openPDFLink",prefValue);
			sltPrefs.setCharPref(oldPrefix+"openPDFLink","");
		}		
	} else if (!sltPrefs.prefHasUserValue(newPrefix+"openPDFLink")) {
		sltPrefs.setCharPref(newPrefix+"openPDFLink","openPDFNewTab");	
	}
	if (sltPrefs.prefHasUserValue(oldPrefix+"openPDFtoHTML")) {
		prefValue = sltPrefs.getCharPref(oldPrefix+"openPDFtoHTML");
		if (prefValue != "") { 
			sltPrefs.setCharPref(newPrefix+"openPDFtoHTML",prefValue);
			sltPrefs.setCharPref(oldPrefix+"openPDFtoHTML","");
		}		
	} else if (!sltPrefs.prefHasUserValue(newPrefix+"openPDFtoHTML")) {
		sltPrefs.setCharPref(newPrefix+"openPDFtoHTML","openHTMLNewTab");	
	}
	if (sltPrefs.prefHasUserValue(oldPrefix+"pdfViewerPath")) {
		prefValue = sltPrefs.getCharPref(oldPrefix+"pdfViewerPath");
		if (prefValue != "") { 
			sltPrefs.setCharPref(newPrefix+"pdfViewerPath",prefValue);
			sltPrefs.setCharPref(oldPrefix+"pdfViewerPath","");
		}		
	}
	if (!sltPrefs.prefHasUserValue(newPrefix+"defaultAction")) {
		sltPrefs.setCharPref(newPrefix+"defaultAction","showPopup");
	}
	// delete the old preferences, if they exist
	try {
		sltPrefs.deleteBranch(oldPrefix);
	} catch (ex) {}
}



/*
 *  Download manager listener part
 */

//Adds download listener
function initDownloadObserver() {

	// Observer Service for events generated by the Download Manager
	var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
	observerService.addObserver(DQ_DownloadObserver, "dl-done",   false);
	observerService.addObserver(DQ_DownloadObserver, "dl-cancel", false);
	observerService.addObserver(DQ_DownloadObserver, "dl-failed", false); 
	observerService.addObserver(DQ_DownloadObserver, "dl-start",  false);
}


//Removes download listener
function unloadDownloadObserver() {

	var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);

	observerService.removeObserver(DQ_DownloadObserver, "dl-done");
	observerService.removeObserver(DQ_DownloadObserver, "dl-cancel");
	observerService.removeObserver(DQ_DownloadObserver, "dl-failed"); 
	observerService.removeObserver(DQ_DownloadObserver, "dl-start");

	downloadQueue = null;
	DQ_DownloadObserver = null;
}


var DQ_DownloadObserver = {

	observe: function (subject, topic, state) {

		var oDownload 	= subject.QueryInterface(Components.interfaces.nsIDownload);
		var oFile	= null;

//		try {
			oFile = oDownload.targetFile;  // New firefox 0.9
//		} catch (e){
//			oFile = oDownload.target;      // Old firefox 0.8
//		}

		if (topic == "dl-cancel" || topic == "dl-failed") { removeFileFromQueue(oFile.path); }
		else if(topic == "dl-done"){
			// File in open queue?
			if(oFile == null || FileInQueue(oFile.path) < 0) {
				return;
			}
			else
				removeFileFromQueue(oFile.path);

			// Execute			
			try {
				openPDFExternally(oFile.path);
			} catch(err) {
				alert(bundle.GetStringFromName("fatalException"));
			}
		}		
	}
}; 

//Is file in Queue?
//returns index, or -1
function FileInQueue(sPath){
	for(var i = 0; i < downloadQueue.length; i++) {
		if(downloadQueue[i] == sPath){
			return i;
		}
	}
	return -1;
}

//Remove file from Queue
function removeFileFromQueue(sPath){
	var index = FileInQueue(sPath);
	if (index > -1) {
		downloadQueue = (new Array()).concat(downloadQueue.slice(0,index), downloadQueue.slice(++index));
	}
}

function removeDownloadedFiles() {
    var todayDir = "pdfdownload-"+pdfDownloadShared.getTodayDate();
	var tempDir = pdfDownloadShared.getPDFDownloadTempDir();
    if (tempDir.exists()) {
        var entries = tempDir.directoryEntries;
        var array = [];
        while(entries.hasMoreElements()) {
          var entry = entries.getNext();
          entry.QueryInterface(Components.interfaces.nsIFile);
          array.push(entry);
        }
        for (var i=0; i < array.length; i++) {
          if (array[i].leafName.indexOf("pdfdownload-") == 0 && array[i].leafName < todayDir) {
              array[i].remove(true);
          }
        }
    }
}

//Register the event listener for a mouse click
function init() {

    removeDownloadedFiles();
	window.removeEventListener("load", init, true);
	getBrowser().addEventListener("click", mouseClick, true);
	try {
		//legacy options
		retrieveLegacyOptions();
	} catch(ex) {}

	document.getElementById("menu_ToolsPopup").addEventListener("popupshowing",togglePDFDownloadItem, false);

	//add download observer
	initDownloadObserver();
}

function uninit() {
	unloadDownloadObserver();
	getBrowser().removeEventListener("click",mouseClick,true);
	document.getElementById("menu_ToolsPopup").removeEventListener("popupshowing",togglePDFDownloadItem, false);
}


//do the init on load
window.addEventListener("load", init, true);
//do the unload
window.addEventListener("unload",uninit,false);

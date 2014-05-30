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
   - Portions created by the Initial Developer are Copyright (C) 2005-2006 Denis Remondini.  
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
   - 
***** END LICENSE BLOCK *****/



const pBranch = Components.interfaces.nsIPrefBranch;
const kDisabledPluginTypesPref = "plugin.disable_full_page_plugin_for_types";
const exceptionsPrefName = "extensions.pdfdownload.exception";
const focusNewTabPref = "browser.tabs.loadInBackground";
const fileCID  = "@mozilla.org/file/local;1";
const fileIID  = Components.interfaces.nsILocalFile;

var sltPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(pBranch);
var downloadQueue = new Array();
var actionQueue = new Array();

function PDFDownloadService() {
	Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader).registerContentListener(this);
}

PDFDownloadService.prototype = {

  QueryInterface: function(aIID) {
     if (aIID.equals(Components.interfaces.nsIURIContentListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
     
     throw Components.results.NS_NOINTERFACE;	
  }
,
  unregister: function() {
    Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader).unRegisterContentListener(this);
  }
,
  checkContentType: function(contentType) {
    if ((contentType == "application/pdf") || (contentType == "application/x-pdf"))
    	return true;
    return false;
  }
, 
  canHandleContent: function(contentType, isContentPreferred, desiredContentType) {
    return this.checkContentType(contentType);
  }
,
  doContent: function(contentType, isContentPreferred, channel, contentHandler) {
    const ci=Components.interfaces;
    channel.QueryInterface(ci.nsIChannel);
	
    var url = channel.URI.spec;
    var size = channel.contentLength;
    this.chooseWhatToDo(url,size);
    channel.cancel(Components.results.NS_BINDING_ABORTED);     
    contentHandler.value=null;

    return true;
  }
,
  isPreferred: function(contentType, desiredContentType) {
    return this.checkContentType(contentType);
  }
,
  onStartURIOpen: function(uri) {
    return false;
  }
,
  buildLocalTarget: function(fileName) {
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
	fp.init(window, "", nsIFilePicker.modeGetFolder);

	var res = fp.show();
	if (res == Components.interfaces.nsIFilePicker.returnOK) {
	    file.initWithPath(fp.file.path);
          file.append(fileName);
	    return file;
      } 

	return null;
  }
,
  chooseWhatToDo: function(url,size) {
   
	var answer = new Object();
	answer.res = "cancel";
	answer.url = url;	
	answer.size = size;
      try {
	  answer.res = sltPrefs.getCharPref("extensions.pdfdownload.defaultAction");
      } catch(ex) {
	  answer.res = "showPopup";
	}

	this.handlePDF(answer);
  }
,
  handlePDF: function(params) {
	var openPDF = "";
	// we extract and validate the filename from the url
	var fname = validateFileName(params.url.substring(params.url.lastIndexOf('/') + 1));
	var extensionPos = fname.indexOf('.pdf');
	if (extensionPos != -1) {
		fname = fname.substring(0,extensionPos+4);
	}

      if (params.res == "showPopup") {
		window.openDialog("chrome://pdfdownload/content/questionBox.xul", "PDF Download", "chrome,modal,centerscreen,dialog",params);
	}
	var isLocalFile = this.isLinkType("file:",params.url);
	if (params.res == "download") {
		var localTarget = this.buildLocalTarget(fname);
		if (localTarget) {
		   if (!isLocalFile) {
		   	this.saveLink(params.url,fname,localTarget);
		   } else {
			this.copyFile(params.url,localTarget.path);
		   }
		}		
	} else if (params.res == "open") {
		// we check how to open the PDF
		try {
			openPDF = sltPrefs.getCharPref("extensions.pdfdownload.openPDF");
		} catch(ex) {
			openPDF = "";
		}
		// In the preferences there was written to open the PDF file using a PDF viewer (default or custom).
		if (!isLocalFile) {
			this.saveTempFile(params.url,fname,openPDF);
		} else {
			var file = this.getFileFromUrl(params.url);
			if (openPDF == "usePlugin") {
				this.openPDFWithPlugin(file.path);
			} else {
				this.openPDF(file.path);
			}
		}	
	} else if (params.res == "openHtml") {	
		if (!isLocalFile) {
			this.getMirror(params.url);			
		} else {
			// since we are dealing with a local file, we cannot use the "View as HTML" option
			params.res = "showPopup";
			this.handlePDF(params);
		}
	}
  }
,
  // Checks the type of a link
  isLinkType: function(linktype, link) {
  	try {
		var protocol = link.substr(0, linktype.length);
		return protocol.toLowerCase() == linktype;
	} catch(e) {
		return false;
	}
  }
,
  getMirror: function(url) {
	var http;
	try {
  		http = new XMLHttpRequest();
 	} catch (e) {
  		http = false;
 	}
	if (http) {
		var uri = "http://www.rabotat.org/firefox/pdfdownload/getmirror.php";
		http.open("GET", uri, true);
		http.onreadystatechange=function() {
			if (http.readyState == 4) {
				if (http.status == 200) {
					if (http.responseText != "") {
						var mirror = http.responseText;
						var pdf2htmlUrl = mirror+"?url="+url;
						const preferencesService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");
						var prefvalue;
						try {
      						prefvalue = preferencesService.getCharPref("openHTML");
    						} catch(ex) {
							prefvalue = "openHTMLNewTab";
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
,
  copyFile: function(sourceFile,destFile) {

  	var aDest = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
  	if (!aDest) return false;

  	aFile = this.getFileFromUrl(sourceFile);
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
,
  getFileFromUrl: function(url) {
 	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  	var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
	return fileHandler.getFileFromURLSpec(url).QueryInterface(Components.interfaces.nsILocalFile);
  }
,
  // save the linked file 
  saveLink: function(url,fname,localTarget) {
  
 	var uri = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
  	uri.spec = url;
	var aDest = Components.classes[fileCID].createInstance(fileIID);
   	aDest.initWithPath(localTarget.path.substring(0,localTarget.path.lastIndexOf(localTarget.leafName)));
 	var i = 0;
  	while (localTarget.exists()) {
		i++;
		localTarget = null;
		localTarget = aDest.clone();
		localTarget.append(this.createNumber(i) + "_" + fname);
  	}

  	var targetUrl = this.makeFileURL(localTarget);

    	// MIME Info
  	const mimeContractID = "@mozilla.org/uriloader/external-helper-app-service;1";
  	var mimeService = Components.classes[mimeContractID].getService(Components.interfaces.nsIMIMEService);
	var mimeInfo = null;
  	try {
    		mimeInfo = mimeService.getFromTypeAndExtension(null, "pdf");
 	}
  	catch (e) { }

  	const dlmgrContractID = "@mozilla.org/download-manager;1";
  	const dlmgrIID = Components.interfaces.nsIDownloadManager;
  	const DOWNLOAD_TYPE_DOWNLOAD = 0;
  	var gDownloadManager = Components.classes[dlmgrContractID].getService(dlmgrIID);

    	// Persist
  	const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  	var persist = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
                          .createInstance(Components.interfaces.nsIWebBrowserPersist);
  	var flags = nsIWBP.PERSIST_FLAGS_NO_CONVERSION |
              nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
              nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
  	persist.persistFlags = flags;
  
  	var download = gDownloadManager.addDownload(DOWNLOAD_TYPE_DOWNLOAD, 
                                                   uri, targetUrl, fname, null, mimeInfo, 0, null, persist);
  	persist.progressListener = download;
  	persist.saveURI(uri, null, null, null, null, targetUrl); 
	// shows the download progress dialog
	window.openDialog("chrome://mozapps/content/downloads/downloads.xul","","chrome,dialog=no,resizable");
  }
,
  makeFileURL: function(aFile) {
 	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
 	return ioService.newFileURI(aFile);
  } 
,
  makeURL: function(aURL) {
	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	return ioService.newURI(aURL, null, null);
  } 
,
  // save the file in a temporary directory
  saveTempFile: function(url,fname,action) {
  	// Local File Target
  	var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
  	var dir = fileLocator.get("TmpD", fileIID);
  	var localTarget = dir.clone();
  	localTarget.append(fname);
  	var i = 0;
  	while (localTarget.exists()) {
		i++;
		localTarget = null;
		localTarget = dir.clone();
		localTarget.append(this.createNumber(i) + "_" + fname);
  	}
  	downloadQueue[downloadQueue.length] = localTarget.path;
	actionQueue[actionQueue.length] = action;
  	this.saveLink(url,fname,localTarget);
  }
, 
  // Opens the pdf file with an external program (the os default one or the one specified by the user under the PDF Download options)
  openPDF: function(filename) {
	var oFile 	= Components.classes[fileCID].getService(fileIID);
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
				/*
				 PDF Download has not been able to find a default viewer, so now we ask to the user to choose a custom viewer.
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
		} else if (openPDF == "customViewer") {
			// In the preferences there was written to open PDF files using a custom viewer

			oFile.initWithPath(pdfViewerPath);
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
	} else {
		alert("Error: cannot open that file. Probably it does not exist.");
	}
  }
,
  openPDFWithPlugin: function(file) {
	/*
	 In the preferences there was written to open the PDF file using the PDF plugin.
	 Now we check in which tab/window we must open the PDF file using the PDF plugin.
	 */		
	var prefvalue;
	try {
		prefvalue = sltPrefs.getCharPref("extensions.pdfdownload.openPDFLink");
	} catch(ex) {
		prefvalue = "openPDFNewTab";
    	}
	var url = this.makeFileURL(file);
	if (prefvalue == "openPDFNewTab") {
		var myTab = getBrowser().addTab("chrome://pdfdownload/content/pdf_embedded.html?pdfFile="+url.spec);
		if (shouldNewTabFocused()) {
			  getBrowser().selectedTab = myTab;
		}
	} else if (prefvalue == "openPDFNewWindow") {
		openNewWindowWith("chrome://pdfdownload/content/pdf_embedded.html?pdfFile="+url.spec, null, null);
	} else {
		getBrowser().loadURI("chrome://pdfdownload/content/pdf_embedded.html?pdfFile="+url.spec);
	} 
  }
,
  // Builds a three char string representing the specified number
  createNumber: function(number) {
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

var pdfDownloadService = new PDFDownloadService();

function init() {
	window.removeEventListener("load", init, true);
	// disable the pdf plug-in (if exists)
      var disabled = "application/pdf";
      if (sltPrefs.prefHasUserValue(kDisabledPluginTypesPref)) {
        disabled = sltPrefs.getCharPref(kDisabledPluginTypesPref);
        if (disabled.indexOf("application/pdf") == -1) {
	    if (disabled == "") {
		 disabled = "application/pdf";
	    } else {
             disabled += "," + "application/pdf";
          }
	  }
      }
      sltPrefs.setCharPref(kDisabledPluginTypesPref, disabled);   
      
	var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
	catman.deleteCategoryEntry("Gecko-Content-Viewers", "application/pdf", false);

	try {
	  //legacy options
	  retrieveLegacyOptions();
	} catch(ex) {}

	document.getElementById("menu_ToolsPopup").addEventListener("popupshowing",togglePDFDownloadItem, false);

	//add download observer
	initDownloadObserver();
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

function uninit() {
	const kDisabledPluginTypesPref = "plugin.disable_full_page_plugin_for_types";
      var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefBranch);
      prefs.setCharPref(kDisabledPluginTypesPref, "");   
	unloadDownloadObserver();
}

var global_downloadManager = null;

function initDownloadObserver() {
  // Download Manager Interface
  const dlmgrContractID = "@mozilla.org/download-manager;1";
  const dlmgrIID = Components.interfaces.nsIDownloadManager;
  global_downloadManager = Components.classes[dlmgrContractID].getService(dlmgrIID);

  // Observer Service for events generated by the Download Manager
  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(DQ_DownloadObserver, "dl-done",   false);
  observerService.addObserver(DQ_DownloadObserver, "dl-cancel", false);
  observerService.addObserver(DQ_DownloadObserver, "dl-failed", false); 
  observerService.addObserver(DQ_DownloadObserver, "dl-start",  false);
}


function unloadDownloadObserver() {
  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observerService.removeObserver(DQ_DownloadObserver, "dl-done");
  observerService.removeObserver(DQ_DownloadObserver, "dl-cancel");
  observerService.removeObserver(DQ_DownloadObserver, "dl-failed"); 
  observerService.removeObserver(DQ_DownloadObserver, "dl-start");
}


var DQ_DownloadObserver = {

  observe: function (subject, topic, state)
  {
	
    	var oDownload 	= subject.QueryInterface(Components.interfaces.nsIDownload);
	var oFile	= null;
	var openPDF = "";
		
	try{
		oFile = oDownload.targetFile;  // New firefox 0.9
	} catch (e){
		oFile = oDownload.target;      // Old firefox 0.8
	}

	if(topic == "dl-cancel" || topic == "dl-failed"){ removeFileFromQueue(oFile.path); }
	else if(topic == "dl-done") {
		// File in open queue?
		var queuePos = FileInQueue(oFile.path);
		if(oFile == null || queuePos < 0) {
			return;
		}
		else {
			openPDF = actionQueue[queuePos];
			removeFileFromQueue(oFile.path);
	
			if (openPDF == "usePlugin") {
				pdfDownloadService.openPDFWithPlugin(oFile);
			} else {
				// Execute			
				try {
					pdfDownloadService.openPDF(oFile.path);
				}catch(err){
					alert("Unexpected error: contact the author!");
				}
			}
		}			
	}
  }
}; 

// Is file in Queue?
//	returns index, or -1
function FileInQueue(sPath){
	for(var i = 0; i < downloadQueue.length; i++) {
		//alert("In coda: "+downloadQueue[i]+" || sPath: "+sPath);
		if(downloadQueue[i] == sPath){
			return i;
		}
	}
	return -1;
}

// Remove file from Queue
function removeFileFromQueue(sPath){
	var index = FileInQueue(sPath);
	if (index > -1) {
		downloadQueue = (new Array()).concat(downloadQueue.slice(0,index), downloadQueue.slice(index+1));
		actionQueue = (new Array()).concat(actionQueue.slice(0,index), actionQueue.slice(index+1));
	}
}


// shows the options dialog for PDF Download
function showPDFDownloadSettings() {
	var settingsHandle = window.openDialog("chrome://pdfdownload/content/options.xul", "","chrome,resizable,centerscreen,close=no,modal");
	settingsHandle.focus();
}


var myPrefObserver =
{
  register: function()
  {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefService);
    this._branch = prefService.getBranch("plugin.");

    var pbi = this._branch.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.addObserver("", this, false);
  },

  unregister: function()
  {
    if(!this._branch) return;

    var pbi = this._branch.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
    pbi.removeObserver("", this);
  },

  observe: function(aSubject, aTopic, aData)
  {
    if (aTopic != "nsPref:changed") 
	return;
    // aSubject is the nsIPrefBranch we're observing
    switch (aData) {
      case "disable_full_page_plugin_for_types":
	  var disabled = "application/pdf";
        if (sltPrefs.prefHasUserValue(kDisabledPluginTypesPref)) {
          disabled = sltPrefs.getCharPref(kDisabledPluginTypesPref);
          if (disabled.indexOf("application/pdf") == -1) {
	      if (disabled == "") {
		   disabled = "application/pdf";
	      } else {
               disabled += "," + "application/pdf";
            }
            sltPrefs.setCharPref(kDisabledPluginTypesPref, disabled);   
	    }
        } else {
          sltPrefs.setCharPref(kDisabledPluginTypesPref, disabled);   
        }
        
	  setTimeout( function() {
	  			var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
	  			catman.deleteCategoryEntry("Gecko-Content-Viewers", "application/pdf", false);
			  }, 100 );
        break;
    }
  }
}

myPrefObserver.register();

// do the init on load
window.addEventListener("load", init, true);
window.addEventListener("unload",uninit,false);

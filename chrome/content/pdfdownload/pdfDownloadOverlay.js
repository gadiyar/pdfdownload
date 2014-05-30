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
   - Portions created by the Initial Developer are Copyright (C) 2005 Denis Remondini.  
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



var sltPrefs = Components.classes['@mozilla.org/preferences-service;1']
               .getService(Components.interfaces.nsIPrefBranch);

var fileCID  = '@mozilla.org/file/local;1';
var fileIID  = Components.interfaces.nsILocalFile;
var strings  = document.getElementById("pdfdownloadStrings");

var downloadQueue = new Array();

// find the base URL for the document
function getBaseUrl() {
	var dir = document.commandDispatcher.focusedWindow.location.href;
      var baseTag = window._content.document.getElementsByTagName('base')[0];
	if (baseTag != null) {
	    dir = baseTag.href;
	}
	return dir;
}


// save the linked file 
function savelink(url) {
	saveURL(url, null, null, true, true, null);	
}

// handle the click event
function mouseClick(aEvent) {

    var globalHistory = Components.classes["@mozilla.org/browser/global-history;2"]
					.getService(Components.interfaces.nsIBrowserHistory);

    if (!aEvent)
      return;

    // if right click, we do not do anything
    if (aEvent.button == 2)
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
    if (ext.toLowerCase() == "gz") {
	  ext = url.substring(lastDotPosition-3,lastDotPosition+3);
  	  url = url.substring(0, lastDotPosition+3);
    } else {
	  ext = url.substring(lastDotPosition + 1, lastDotPosition + 4);
	  url = url.substring(0, lastDotPosition + 4);
    }
    if ( (ext.toLowerCase() == "pdf") || (ext.toLowerCase() == "pdf.gz") ) {
	// we do not support local files. In a future version, we will do it (maybe)
	if (isLinkType("file:",url)) {
		return;
	} 

	var answer = new Object();
	answer.res = "cancel";
	answer.url = url;
	window.openDialog("chrome://pdfdownload/content/questionBox.xul", "PDF Download", "chrome,modal,centerscreen,dialog,resizable",answer,ext);
	var openPDF = "";
	if (answer.res == "download") {
		savelink(url);
	} else if (answer.res == "open") {
		// we check how to open the PDF
		try {
			openPDF = sltPrefs.getCharPref("pdfdownload.openPDF");
		} catch(ex) {
			openPDF = "";
		}
		if (openPDF == "usePlugin") {
			/*
			 In the preferences there was written to open the PDF file using the PDF plugin.
			 Now we check in which tab/window we must open the PDF file using the PDF plugin.
			 */		
			var prefvalue;
			try {
      			prefvalue = sltPrefs.getCharPref("pdfdownload.openPDFLink");
    			} catch(ex) {
				prefvalue = "openPDFNewTab";
    			}
			if (prefvalue == "openPDFNewTab") {
				getBrowser().addTab(url);
			} else if (prefvalue == "openPDFNewWindow") {
				openNewWindowWith(url, null, null);
			} else {
				getBrowser().loadURI(url);
			} 
		} else {
			// In the preferences there was written to open the PDF file using a PDF viewer (default or custom).
			var fname = url.substring(url.lastIndexOf('/') + 1);
			saveTempFile(url,fname);	
		}
	} else if (answer.res == "openHtml") {
		getMirror(url);
	}
	if (answer.res != "cancel") {
		// we set the pdf link as a visited link!!
		var referrer = makeURL(document.commandDispatcher.focusedWindow.location.href);
		var gURIFixer = Components.classes["@mozilla.org/docshell/urifixup;1"].
		     			getService(Components.interfaces.nsIURIFixup);
		var visitedURI = gURIFixer.createFixupURI(targ.href, 0)
		markLinkVisited(visitedURI.spec, targ, referrer);
	}
	aEvent.preventDefault();
	aEvent.stopPropagation();	
    }
}

// function taken from old contentAreaUtils.js and fixed up a little bit 
// to support Firefox 1.5
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
    else {
      // Converting to string implicitly would be a 
      // minor security hole (similar to bug 202994).
    }
  }
}

function makeURL(aURL)
{
	var ioService = Components.classes["@mozilla.org/network/io-service;1"]
				.getService(Components.interfaces.nsIIOService);
	return ioService.newURI(aURL, null, null);
} 

// we find which mirror is better to use to do the PDF->HTML conversion
function getMirror(url) {
	var http;
	try {
  		http = new XMLHttpRequest();
 	} catch (e) {
  		http = false
 	}
	if (http) {
		// this is the server-side script that handle the mirror list
		var uri = "http://www.rabotat.org/firefox/pdfdownload/getmirror.php";
		http.open("GET", uri, true);
		http.onreadystatechange=function() {
			if (http.readyState == 4) {
				if (http.status == 200) {
					if (http.responseText != "") {
						var mirror = http.responseText;
						var pdf2htmlUrl = mirror+"?url="+url;
						const preferencesService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("pdfdownload.");
						var prefvalue;
						try {
      						prefvalue = preferencesService.getCharPref("openPDFtoHTML");
    						} catch(ex) {
							prefvalue = "openHTMLNewTab";
    						}
						if (prefvalue == "openHTMLNewTab") {
							getBrowser().addTab(pdf2htmlUrl);
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

// save the file in a temporary directory
function saveTempFile(url,fname) {
  // Local File Target
  var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
  var dir = fileLocator.get("TmpD", Components.interfaces.nsILocalFile);
  var localTarget = dir.clone();
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

  downloadQueue[downloadQueue.length] = localTarget.path;
  try  {
	var acObject = new AutoChosen(localTarget, uri);
                      
      internalSave(url, null, fname, null, null, false, null, acObject, null, false);
  } catch (e) {
      saveURL(url, localTarget, null, false, false, null);
  }

}

// Opens the pdf file with an external program (the os default one or the one specified by the user under the PDF Download options)
function openPDF(filename) {
	var oFile 	= Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
	oFile.initWithPath(filename);
	if (oFile != null && oFile.exists()) {
		var pdfViewerPath = "";
		var openPDF = "";
		// we check how to open the PDF
		try {
                  openPDF = sltPrefs.getCharPref("pdfdownload.openPDF");
			pdfViewerPath = sltPrefs.getCharPref("pdfdownload.pdfViewerPath");
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
                              openPDF = sltPrefs.getCharPref("pdfdownload.openPDF");
  					pdfViewerPath = sltPrefs.getCharPref("pdfdownload.pdfViewerPath");
				} catch(ex) {
					openPDF = "defaultViewer";
		      	}
			}
		} 
		if (openPDF == "customViewer") {
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
		} else if (openPDF == "usePlugin") {
			/*
			 In the preferences there was written to open the PDF file using the PDF plugin.
			 Now we check in which tab/window we must open the PDF file using the PDF plugin.
			 */		
			var prefvalue;
			try {
      			prefvalue = sltPrefs.getCharPref("pdfdownload.openPDFLink");
    			} catch(ex) {
				prefvalue = "openPDFNewTab";
    			}
			if (prefvalue == "openPDFNewTab") {
				getBrowser().addTab(filename);
			} else if (prefvalue == "openPDFNewWindow") {
				openNewWindowWith(filename, null, null);
			} else {
				getBrowser().loadURI(filename);
			}
		}
	} else {
		alert("Error: cannot open that file. Probably it does not exist.");
	}
}


// Checks the type of a link
function isLinkType (linktype, link) {
	try {
		var protocol = link.substr(0, linktype.length);
		return protocol.toLowerCase() == linktype;
	} catch(e) {
		return false;
	}
}

// Builds a three char string representing the specified number
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

// shows the options dialog for PDF Download
function showPDFDownloadSettings() {
	var settingsHandle = window.openDialog("chrome://pdfdownload/content/options.xul", "","chrome,resizable,centerscreen,close=no,modal");
	settingsHandle.focus();
}

/*
 *  Download manager listener part
 */

var global_downloadManager = null;

// Adds download listener
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


// Removes download listener
function unloadDownloadObserver() {

  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);

  observerService.removeObserver(DQ_DownloadObserver, "dl-done");
  observerService.removeObserver(DQ_DownloadObserver, "dl-cancel");
  observerService.removeObserver(DQ_DownloadObserver, "dl-failed"); 
  observerService.removeObserver(DQ_DownloadObserver, "dl-start");
}


var DQ_DownloadObserver = {

  observe: function (subject, topic, state) {
	
    	var oDownload 	= subject.QueryInterface(Components.interfaces.nsIDownload);
	var oFile	= null;
		
	try{
		oFile = oDownload.targetFile;  // New firefox 0.9
	} catch (e){
		oFile = oDownload.target;      // Old firefox 0.8
	}

	if(topic == "dl-cancel" || topic == "dl-failed"){ removeFileFromQueue(oFile.path); }
	else if(topic == "dl-done"){
		// File in open queue?
		if(oFile == null || FileInQueue(oFile.path) < 0) {
			return;
		}
		else
			removeFileFromQueue(oFile.path);
			
		// Execute			
		try {
			openPDF(oFile.path);
		}catch(err){
			alert("Unexpected error: contact the author!");
		}
	}		
  }
}; 

// Is file in Queue?
//	returns index, or -1
function FileInQueue(sPath){
	for(var i = 0; i < downloadQueue.length; i++) {
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
		downloadQueue = (new Array()).concat(downloadQueue.slice(0,index), downloadQueue.slice(++index));
	}
}



// Register the event listener for a mouse click
function init() {

	window.removeEventListener("load", init, true);
	getBrowser().addEventListener("click", mouseClick, true);
	//add download observer
	initDownloadObserver();
}


// do the init on load
window.addEventListener("load", init, true);
// do the unload
window.addEventListener("unload",unloadDownloadObserver,false);

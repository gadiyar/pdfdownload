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
   - Portions created from Jan 2008 are Copyright (C) 2008 Nitro PDF, Inc. & Nitro PDF Pty Ltd. 
   - All Rights Reserved.
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
Components.utils.import("resource://pdfdownload/NitroStartup.js");
Components.utils.import("resource://pdfdownload/NitroStartupImpl.js");
 
 /*
	A namespace for PDF Download addon
 */
 var PDFDownloadNamespace = {};
 
 /*
	PDF Download overlay
 */
 PDFDownloadNamespace.PDFDownloadOverlay = function() {
	//dump("PDFDownloadOverlay function call\n");
	 this.kPluginHandlerContractID = "@mozilla.org/content/plugin/document-loader-factory;1";
	 this.kDisabledPluginTypesPref = "plugin.disable_full_page_plugin_for_types";
	 this.fileCID 				   = "@mozilla.org/file/local;1";
	 this.fileIID 				   = Components.interfaces.nsILocalFile;
	 this.nsIWBP				   = Components.interfaces.nsIWebBrowserPersist;
	 this.mimeType				   = "application/pdf";
	 this.sPrefPrefix 			   = "extensions.pdfdownload.";
	 this.viewOnlineURL 		   = "http://www.pdfdownload.org/pdf2html/view_online.php";
	 
	 this.sltPrefs	 			  =	null;//Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	 this.bundleService		 	  = null;//Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
	 this.pdfDownloadBundle 	  = null;//this.bundleService.createBundle("chrome://pdfdownload/locale/pdfdownload.properties");
	 
	 this.openedSite = {
		url: "",
		isAddonDisabed: ""
	 };
 
	 this.downloadQueue = new Array();
	 
	 this.sitesWithDisabledAddon = new Array();
	 
	 
	 this.onStatusBarButtonClick = function() {
		this.openedSite.isAddonDisabled = !this.openedSite.isAddonDisabled;
	
		if (this.openedSite.isAddonDisabled) {
			this.sitesWithDisabledAddon.push(this.parseUrl(this.getCurrentLocation()));
		}
		else {
			this.removeSiteFromDisabledSitesList(this.parseUrl(this.getCurrentLocation()));
		}

		this.setStatusBarButtonIcon(this.openedSite.isAddonDisabled);
	 };
	 
	 this.onMouseOver = function(event) {
		var tooltipName = this.getToolTipForStatusBarButton();
		this.showStatusBarButtonState(event, tooltipName);
	 };
	 
	 this.onMouseOut = function(event) {
		var tooltipName = this.getToolTipForStatusBarButton();
		this.hideStatusBarButtonState(tooltipName);
	 };
	 
	 this.showStatusBarButtonState = function(event, tooltipName) {
		var popup = document.getElementById(tooltipName);
		var statusBarButton = document.getElementById('pdfdownload-statusbarButton');
	
		popup.showPopup(statusBarButton, 
						statusBarButton.boxObject.screenX, 
						statusBarButton.boxObject.screenY - 3.5 * statusBarButton.boxObject.height, 
						"tooltip", "topleft", "topleft");
	 };
	 
	 this.hideStatusBarButtonState = function(tooltipName) {
		var popup = document.getElementById(tooltipName);
		popup.hidePopup();
	 };
	 
	 this.getToolTipForStatusBarButton = function() {
		if (this.openedSite.isAddonDisabled) {
		 return "enableAddonTooltip";
		}
	 
		return "disableAddonTooltip";
	 };
	 
	 this.showPDFDownloadSettings = function() {
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
	 };
	 
	 this.generatePDFFromPageWithAction = function(action) {
		var saveAsPdfUrl = "http://www.pdfdownload.org/web2pdf/Default.aspx?";
		var currentUrl = gBrowser.selectedBrowser.currentURI.spec;
		var top = 0.5;
		var bottom = 0.5;
		var left = 0.5;
		var right = 0.5;
		var pageOrientation = 0; // portrait
    
		try {
			top = this.sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.top");
		} catch (e) {}
		try {
			bottom = this.sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.bottom");
		} catch (e) {}
		try {
			left = this.sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.left");
		} catch (e) {}
		try {
			right = this.sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.right");
		} catch (e) {}
    
		try {
			pageOrientation = this.sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.pageOrientation");
		} catch (e) {}
		saveAsPdfUrl = saveAsPdfUrl + "page="+pageOrientation+"&top="+top+"&bottom="+bottom+"&left="+left+"&right="+right+"&cURL="+encodeURIComponent(currentUrl);
		if (action == "download") {
			var tab = getBrowser().addTab(saveAsPdfUrl);
			getBrowser().selectedTab = tab;
		} else {
			var emailAddress = this.getSetting("webToPDF.emailAddress", "");
			var validEmail = NitroPDF.PDFDownload.Shared.validateEmail(emailAddress);

			if (action == "sendEmail" && validEmail) {
				saveAsPdfUrl = saveAsPdfUrl + "&email=" + emailAddress;
				var tab = getBrowser().addTab(saveAsPdfUrl);
				getBrowser().selectedTab = tab;
			} 
			if (action == "askEmail" || !validEmail) {
				var param = new Object();
				param.defaultValue = null;
				window.openDialog("chrome://pdfdownload/content/emailDialog.xul", "pdfdownloadEmailDialog", "centerscreen,chrome,modal",param);
				if (param.res == true) {
					var emailAddress = param.inputSubmitted;
					saveAsPdfUrl = saveAsPdfUrl + "&email=" + emailAddress;
					var tab = getBrowser().addTab(saveAsPdfUrl);
					getBrowser().selectedTab = tab;
				 }
			 }  
		 }
	 };
	 
	 this.generatePDFFromPage = function() {
		var action = this.getSetting("webToPDF.action", "askEmail");
		this.generatePDFFromPageWithAction(action);
	 };
	 
	 this.openPDFExternally = function(filename) {
		var oFile 	= Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
		oFile.initWithPath(filename);
		if (oFile != null && oFile.exists()) {
			var pdfViewerPath = this.getSetting("pdfViewerPath", "");
			var openPDF = this.getSetting("openPDF", "");

			if (openPDF == "defaultViewer") {
				// In the preferences there was written to open PDF files using the default viewer
				try {
					oFile.launch();
				} catch (e) {
					try {
						this.openExternal(oFile);
					} catch (ex) {
						/*
						* PDF Download has not been able to find a default viewer, so now we ask to the user to choose a custom viewer.
						*/
						window.openDialog("chrome://pdfdownload/content/osWarning.xul","pdfdownload-OS-warning-window","centerscreen,chrome,modal");
						this.showPDFDownloadSettings();

						openPDF = this.getSetting("openPDF", "defaultViewer");
						pdfViewerPath = this.getSetting("pdfViewerPath", "");
					 }
				 }
			 } 
			if (openPDF == "customViewer") {
				// In the preferences there was written to open PDF files using a custom viewer
				var absoluteFileName = NitroPDF.PDFDownload.Shared.resolveFileName(pdfViewerPath);
			
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
				 } else {
					alert(this.pdfDownloadBundle.GetStringFromName("openPDFError"));
				 }
			 }
		 } else {
			alert(this.pdfDownloadBundle.GetStringFromName("openPDFError"));
		 }
	 };
	 
	 this.handlePDF = function(params, ext, normalizedUrl, filename) {
    	if ((params.res == "showPopup") || 
			((params.res == "openHtml") && ((params.url.indexOf("//localhost") != -1) || (params.url.indexOf("//127.0.0.1") != -1)))) {
			this.getMostRecentBrowserWindow().openDialog("chrome://pdfdownload/content/questionBox.xul", "PDF Download", "chrome,modal,centerscreen,dialog", params, ext);
		} 
		
        var isLocalFile = this.isLinkType("file:",params.url);
        var fname = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
		var openPDF = "";
		
		if (filename != null) {
			fname = filename;
		} 
		else {
	    		var pos = fname.lastIndexOf('.');
	    		var ext = fname.substring(pos).toLowerCase();
    	
		    	if (ext != '.pdf') {
				fname = fname.substring(0, pos) + '.pdf';
			}
		}
		
		if (params.res == "download") {
            if (isLocalFile) {
                var localTarget = this.buildLocalTarget(fname);
                if (localTarget != null) {
			        this.copyFile(params.url,localTarget.path);
                }
            } else {
                this.savelink(params.url, filename);
            }
        } else if (params.res == "openWithoutExtension") {
        	this.openPDFWithPlugin(params.url);
		} else if (params.res == "open") {
			// we check how to open the PDF
			openPDF = this.getSetting("openPDF", "");

			
            if (!isLocalFile) {	
    			if (openPDF == "usePlugin") {
    				this.openPDFWithPlugin(params.url);
    			} else {
    				// In the preferences there was written to open the PDF file using a PDF viewer (default or custom).
    				this.saveTempFile(params.url,fname);	
    			}
            } else {
    			var file = this.getFileFromUrl(params.url);
    			if (openPDF == "usePlugin") {
    				this.openPDFWithPlugin(file.path);
    			} else {
    				this.openPDFExternally(file.path);
    			}
		    }
		} else if (params.res == "openHtml") {
            if (isLocalFile) {
                // since we are dealing with a local file, we cannot use the "View as HTML" option
                params.res = "showPopup";
                this.handlePDF(params,ext,normalizedUrl);
            } else {
			    this.getMirror(encodeURIComponent(params.url),params.filesize);
            }
		} else if (params.res == "viewOnline") {
            if (isLocalFile) {
                // since we are dealing with a local file, we cannot use the "View as HTML" option
                params.res = "showPopup";
                this.handlePDF(params,ext,normalizedUrl);
            } else {
			    //var prefvalue = this.getSetting("openPDFtoHTML", "openHTMLNewTab");
				var prefvalue = this.getSetting("viewPDFOnline", "viewingPDFNewTab");
				
			    var url = this.viewOnlineURL + "?url=" + encodeURIComponent(params.url);
				
				if (prefvalue == "viewingPDFNewTab") {
					this.loadNewTabURI(url);
				//} else if (prefvalue == "openHTMLNewWindow") {
				//	loadNewWindowURI(url);
				} else {
					getBrowser().loadURI(url); // Just do a normal load.
				}
            }            
		}
	 };
	 
	 this.getMostRecentBrowserWindow = function() {
		var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
		var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
	
		return windowManagerInterface.getMostRecentWindow( "navigator:browser" );
	 };

	 this.getMostRecentBrowser = function() {
		return this.getMostRecentBrowserWindow().getBrowser();
	 };
	 
	 this.buildLocalTarget = function(fileName) {
		var file  = Components.classes[this.fileCID].createInstance(this.fileIID);
		var useDownloadDir = this.sltPrefs.getBoolPref("browser.download.useDownloadDir");
		if (useDownloadDir == true) {
			var folderList = this.sltPrefs.getIntPref('browser.download.folderList');
			if (folderList == 0) {
				var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
				var dir = fileLocator.get("Desk", this.fileIID);
				var localTarget = dir.clone();
				localTarget.append(fileName);	
				return localTarget;			
			} else {
				var downloadDir = this.sltPrefs.getCharPref('browser.download.dir');
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
		appendFiltersForContentType(fp, this.mimeType, "pdf", SAVEMODE_FILEONLY);
		var res = fp.show();
		if (res == Components.interfaces.nsIFilePicker.returnOK) {
			file.initWithPath(getNormalizedLeafName(fp.file.path,"pdf"));
			//file.append(fileName);
			return file;
		} 

		return null;
	 };
	 
	 this.mouseClick = function(aEvent) {
		var globalHistory = Components.classes["@mozilla.org/browser/global-history;2"]
											.getService(Components.interfaces.nsIBrowserHistory);
		if (!this.isMouseClickMode()) {
			// this is not our mode
			return;
		}

		if (!aEvent) {
			return;
		}

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
			while (targ.parentNode) {
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

		// remove heading spaces
		url = url.replace(/^\s+/, '');
   
		// we check if the link is absolute or not
		if ( (!this.isLinkType("http", url)) && (!this.isLinkType("file:",url)) && (!this.isLinkType("ftp",url)) ) {
			// the link is not absolute, hence we need to build the absolute link
			var dir = this.getBaseUrl();
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
		if (url.toLowerCase().indexOf('javascript:') != -1)
			return;

		//retrieve the url from a google link
		if ((url.match(/^http:\/\/[a-z.]+google.[a-z.]+\/url\?/i)) && (url.match(/[\\?&]url=([^&#]+)/i))) {
			url = decodeURIComponent(RegExp.$1);
		}
		// special case for yahoo search results
		if (url.match(/^http:\/\/[a-z.]+yahoo.[a-z.]+\//i) && (url.match(/\/\*\*([^&#]+)/i))) {
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
			answer.res = this.getSetting("defaultAction", "showPopup");

			// get a file size
			var httpRequest = new XMLHttpRequest();
			httpRequest.open("HEAD", originalUrl, false);
			httpRequest.send(null);
		
			if (200 == httpRequest.status) {
				// all is ok a file size can be read
				var contentLength = httpRequest.getResponseHeader("Content-Length");
				answer.filesize = contentLength;
			}
		
			if (this.openedSite.isAddonDisabled || !this.isSiteAvailable(url)) {
				// a site in an Exclusion list - do default action
				answer.res = "openWithoutExtension";
			}
			else {
				this.handlePDF(answer, ext, url, null);	
			}
        
			if (answer.res != "cancel") {
				// we set the pdf link as a visited link!!
				var referrer = this.makeURL(this.getCurrentLocation());
				var gURIFixer = Components.classes["@mozilla.org/docshell/urifixup;1"].getService(Components.interfaces.nsIURIFixup);
				var visitedURI = gURIFixer.createFixupURI(targ.href, 0)
				this.markLinkVisited(visitedURI.spec, targ, referrer);
			}
			if (answer.res != "openWithoutExtension") {
				aEvent.preventDefault();
				aEvent.stopPropagation();	
			}
		}
	 };
	 
	 this.loadNewTabURI = function(url) {
		var tab = this.getMostRecentBrowser().addTab(url);
		if (this.shouldNewTabFocused()) {
			getBrowser().selectedTab = tab;
		}
	 };
		
	 this.loadNewWindowURI = function(url) {
		this.loadNewTabURI(url);
	 };
	 
	 // get URL of the focuced window
	 this.getCurrentLocation = function() {
		return document.commandDispatcher.focusedWindow.location.href;
	 };

	 //find the base URL for the document
	 this.getBaseUrl = function() {
		var dir = this.getCurrentLocation();
		var baseTag = window._content.document.getElementsByTagName('base')[0];
		if (baseTag != null) {
			if ((baseTag.href != null) && (baseTag.href != "")) {
				dir = baseTag.href;
			}
		}
		return dir;
	 };

	 //save the linked file 
	 this.savelink = function(url, filename) {
		var ifi = initFileInfo;
		var ogdfn = getDefaultFileName;

		initFileInfo = function(aFI, aURL, aDocument, aContentType, aContentDisposition) {
			var pos = aURL.lastIndexOf('.');
			var ext = aURL.substring(pos).toLowerCase();
    	
			if (ext == '.pdf') {
				ifi(aFI, aURL, aDocument, aContentType, aContentDisposition);
			} else {
				var npos = aURL.lastIndexOf('/');
				var name = aURL.substring(npos+1, pos);
			
				if (filename != null) {
					name = filename;
				}
			
				aFI.uri = makeURI(aURL);
				aFI.fileName = name;
				aFI.fileExt = 'pdf';
				aFI.fileBaseName = name;
			}
		}

		saveURL(url, null, null, true, true, makeURI(url));

		initFileInfo = ifi;
		getDefaultFileName = ogdfn;
	 };
	 
	 /**
	  * Extract file name from HTTP header
	  */
	 this.getHttpRequestFileName = function(http) {
		try {
			//dump("getHttpRequestFileName start\n");
			var fname = http.getResponseHeader("Content-Disposition");
			var parts = fname.split(';');
    	
			for(var i=0; i<parts.length; i++) {
				var line = parts[i].replace(/^\s+|\s+$/g, '');
				//var line = parts[i].trimSpace();

				if ("filename=" == line.substring(0, 9)) {
					var filename = line.substring(9).replace(/^\"+|\"+$/g, '');
					//var filename = line.substring(9).trimQuotes();
   			
					if (filename.length > 0) {
						return filename;
					}
				}
			}
		} catch(ex) {}

		//dump("getHttpRequestFileName end\n");
		return null;
	 };
	 
	 this.getAbsSetting = function(name, defvalue) {
		var value = defvalue;

		try {
			value = this.sltPrefs.getCharPref(name);
		} catch(ex) {}

		return value;
	 };

	 this.getAbsBoolSetting = function(name, defvalue) {
		var value = defvalue;

		try {
			value = this.sltPrefs.getBoolPref(name);
		} catch(ex) {}

		return value;
	 };

	 this.getSetting = function(name, defvalue) {
		return this.getAbsSetting(this.sPrefPrefix + name, defvalue);
	 };

	 this.getBoolSetting = function(name, defvalue) {
		return this.getAbsBoolSetting(this.sPrefPrefix + name, defvalue)
	 };

	 this.isMouseClickMode = function() {
		var defvalue = "name";
		var value = this.getSetting("clickMode", defvalue);
			//dump('isMouseClickMode ' + value + '==' + defvalue + '\n');
		return (value == defvalue);
	 };

	 this.shouldNewTabFocused = function() {
		return !this.getAbsBoolSetting("browser.tabs.loadInBackground", true);
	 };
	 
	 this.openPDFWithPlugin = function(url) {
		/*
		 * In the preferences there was written to open the PDF file using the PDF plugin.
		 * Now we check in which tab/window we must open the PDF file using the PDF plugin.
		 */		
		var prefvalue = this.getSetting("openPDFLink", "openPDFNewTab");

		this.enablePDFPlugin();

		if (prefvalue == "openPDFNewTab") {
			this.loadNewTabURI(url);
		} else if (prefvalue == "openPDFNewWindow") {
			this.loadNewWindowURI(url);
		} else {
			getBrowser().loadURI(url);
		}     

		setTimeout(function() {
			this.disablePDFPlugin();
		}, 1000);
	 };
	 
	 //function taken from old contentAreaUtils.js and fixed up a little bit 
	 //to support Firefox 1.5
	 this.markLinkVisited = function(href, linkNode,referrer) {
		var globalHistory = Components.classes["@mozilla.org/browser/global-history;2"]
											.getService(Components.interfaces.nsIGlobalHistory2);

		var uri = this.makeURL(href);
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
	 };
	 
	 this.makeURL = function(aURL) {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"]
										.getService(Components.interfaces.nsIIOService);
		return ioService.newURI(aURL, null, null);
	 };

	 this.makeFileURL = function(aFile) {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		return ioService.newFileURI(aFile);
	 };

	 this.getFileFromUrl = function(url) {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
		return fileHandler.getFileFromURLSpec(url).QueryInterface(Components.interfaces.nsILocalFile);
	 };

	 this.copyFile = function(sourceFile,destFile) {
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
	 };
	 
	 //we find which mirror is better to use to do the PDF->HTML conversion
	 this.getMirror = function(url,filesize) {
		var http;
		var Me = this;
		
		try {
			http = new XMLHttpRequest();
		} catch (e) {
			http = false
		}
		if (http) {
			// this is the server-side script that handle the mirror list
			var uri = "http://pdf2html.nitropdf.com/getmirror.asp?filesize="+filesize;
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
								Me.loadNewTabURI(pdf2htmlUrl);
							} else if (prefvalue == "openHTMLNewWindow") {
								Me.loadNewWindowURI(pdf2htmlUrl);
							} else {
								getBrowser().loadURI(pdf2htmlUrl); // Just do a normal load.
							}
						}
					}
				}
			}	
			http.send(null);
		}
	 };

	 //save the file in a temporary directory
	 this.saveTempFile = function(url,fname) {
		// Local File Target
		var todayDir = "pdfdownload-"+NitroPDF.PDFDownload.Shared.getTodayDate();
		var localTarget = NitroPDF.PDFDownload.Shared.getPDFDownloadTempDir();
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
			localTarget.append(this.createNumber(i) + "_" + fname);
		}

		var uri = Components.classes["@mozilla.org/network/standard-url;1"]
									.createInstance(Components.interfaces.nsIURI);
		uri.spec = url;

		var referer = Components.classes["@mozilla.org/network/standard-url;1"]
									.createInstance(Components.interfaces.nsIURI);
		referer.spec = this.getCurrentLocation();

		this.downloadQueue[this.downloadQueue.length] = localTarget.path;

		var progressPersist = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1'].createInstance(Components.interfaces.nsIWebBrowserPersist);

		var flags = this.nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION | this.nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES | this.nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
		progressPersist.persistFlags = flags;

		var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);
		tr.init(uri,this.makeFileURI(localTarget), "", null, null, null, progressPersist);
		progressPersist.progressListener = tr;

		progressPersist.saveURI(uri, null, referer, null, null, localTarget);
	 };
	 
	 //Checks the type of a link
	 this.isLinkType = function(linktype, link) {
		try {
			var protocol = link.substr(0, linktype.length);
			return protocol.toLowerCase() == linktype;
		} catch(e) {
			return false;
		}
	 };

	 this.makeFileURI = function(aFile) {
		var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		return ioService.newFileURI(aFile);
	 };

	 //Builds a three char string representing the specified number
	 this.createNumber = function(number) {
		var Stringa;
		if (number <= 9) { 
			Stringa = "00" + number;
		} else if (number <= 99 && number >= 10) { 
			Stringa = "0" + number;
		} else {
			Stringa = number;
		}
		return Stringa;
	 };
	 
	 this.retrieveLegacyOptions = function() {
		const oldPrefix = "pdfdownload.";
		const newPrefix = "extensions.pdfdownload.";
		var prefValue;

		if (this.sltPrefs.prefHasUserValue(oldPrefix+"openPDF")) {
			prefValue = this.sltPrefs.getCharPref(oldPrefix+"openPDF");
			if (prefValue != "") { 
				this.sltPrefs.setCharPref(newPrefix+"openPDF",prefValue);
				this.sltPrefs.setCharPref(oldPrefix+"openPDF","");
			}		
		} else if (!this.sltPrefs.prefHasUserValue(newPrefix+"openPDF")) {
			this.sltPrefs.setCharPref(newPrefix+"openPDF","defaultViewer");	
		}
		if (this.sltPrefs.prefHasUserValue(oldPrefix+"openPDFLink")) {
			prefValue = this.sltPrefs.getCharPref(oldPrefix+"openPDFLink");
			if (prefValue != "") { 
				this.sltPrefs.setCharPref(newPrefix+"openPDFLink",prefValue);
				this.sltPrefs.setCharPref(oldPrefix+"openPDFLink","");
			}		
		} else if (!this.sltPrefs.prefHasUserValue(newPrefix+"openPDFLink")) {
			this.sltPrefs.setCharPref(newPrefix+"openPDFLink","openPDFNewTab");	
		}
		if (this.sltPrefs.prefHasUserValue(oldPrefix+"openPDFtoHTML")) {
			prefValue = this.sltPrefs.getCharPref(oldPrefix+"openPDFtoHTML");
			if (prefValue != "") { 
				this.sltPrefs.setCharPref(newPrefix+"openPDFtoHTML",prefValue);
				this.sltPrefs.setCharPref(oldPrefix+"openPDFtoHTML","");
			}		
		} else if (!this.sltPrefs.prefHasUserValue(newPrefix+"openPDFtoHTML")) {
			this.sltPrefs.setCharPref(newPrefix+"openPDFtoHTML","openHTMLNewTab");	
		}
		if (this.sltPrefs.prefHasUserValue(oldPrefix+"pdfViewerPath")) {
			prefValue = this.sltPrefs.getCharPref(oldPrefix+"pdfViewerPath");
			if (prefValue != "") { 
				this.sltPrefs.setCharPref(newPrefix+"pdfViewerPath",prefValue);
				this.sltPrefs.setCharPref(oldPrefix+"pdfViewerPath","");
			}		
		}
		if (!this.sltPrefs.prefHasUserValue(newPrefix+"defaultAction")) {
			this.sltPrefs.setCharPref(newPrefix+"defaultAction","showPopup");
		}
		// delete the old preferences, if they exist
		try {
			this.sltPrefs.deleteBranch(oldPrefix);
		} catch (ex) {}
	 };
	 
	 /*
	  *  Download manager listener part
	  */

	 //Adds download listener
	 this.initDownloadObserver = function() {

		// Observer Service for events generated by the Download Manager
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
		observerService.addObserver(this.DQ_DownloadObserver, "dl-done",   false);
		observerService.addObserver(this.DQ_DownloadObserver, "dl-cancel", false);
		observerService.addObserver(this.DQ_DownloadObserver, "dl-failed", false); 
		observerService.addObserver(this.DQ_DownloadObserver, "dl-start",  false);
	 }


	 //Removes download listener
	 this.unloadDownloadObserver = function() {
		var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);

		observerService.removeObserver(this.DQ_DownloadObserver, "dl-done");
		observerService.removeObserver(this.DQ_DownloadObserver, "dl-cancel");
		observerService.removeObserver(this.DQ_DownloadObserver, "dl-failed"); 
		observerService.removeObserver(this.DQ_DownloadObserver, "dl-start");

		this.downloadQueue = null;
		this.DQ_DownloadObserver = null;
	 }


	 this.DQ_DownloadObserver = {
		_overlay: null,
			
		observe: function (subject, topic, state) {

			var oDownload 	= subject.QueryInterface(Components.interfaces.nsIDownload);
			var oFile = oDownload.targetFile; // New firefox 0.9

			if (topic == "dl-cancel" || topic == "dl-failed") { this._overlay.removeFileFromQueue(oFile.path); }
			else if(topic == "dl-done"){
				// File in open queue?
				if(oFile == null || this._overlay.FileInQueue(oFile.path) < 0) {
					return;
				}
				else
					this._overlay.removeFileFromQueue(oFile.path);

				// Execute			
				try {
					this._overlay.openPDFExternally(oFile.path);
				} catch(err) {
					alert(this._overlay.pdfDownloadBundle.GetStringFromName("fatalException"));
				}
			}		
		}
	 }; 
	 this.DQ_DownloadObserver._overlay = this;

	 //Is file in Queue?
	 //returns index, or -1
	 this.FileInQueue = function(sPath) {
		for(var i = 0; i < this.downloadQueue.length; i++) {
			if(this.downloadQueue[i] == sPath){
				return i;
			}
		}
		return -1;
	 };

	 //Remove file from Queue
	 this.removeFileFromQueue = function(sPath) {
		var index = this.FileInQueue(sPath);
		if (index > -1) {
			this.downloadQueue = (new Array()).concat(this.downloadQueue.slice(0,index), this.downloadQueue.slice(++index));
		}
	 };

	 this.removeDownloadedFiles = function() {
		var todayDir = "pdfdownload-"+NitroPDF.PDFDownload.Shared.getTodayDate();
		var tempDir = NitroPDF.PDFDownload.Shared.getPDFDownloadTempDir();
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
	 };
	 
	 this.openExternal = function(aFile) {
		var uri = Components.classes["@mozilla.org/network/io-service;1"]
                       .getService(Components.interfaces.nsIIOService)
                       .newFileURI(aFile);
 
		var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
					.getService(Components.interfaces.nsIExternalProtocolService);
 
		protocolSvc.loadUrl(uri);
		return;
	 };
	 
	 this.UninstallObserver = {
		_uninstall : false,
		_sltPrefs : null,
    
		observe : function(subject, topic, data) {
			if (topic == "em-action-requested") {
				subject.QueryInterface(Components.interfaces.nsIUpdateItem);
    
				if (subject.id == NitroPDF.PDFDownload.Shared.getUuid()) {
					if (data == "item-uninstalled") {
						this._uninstall = true;
					} else if (data == "item-cancel-action") {
						this._uninstall = false;
					}
				}
			} else if (topic == "quit-application-granted") {
				if (this._uninstall) {
					this._sltPrefs.clearUserPref("extensions.pdfdownload.firstInstallation");
				}
				this.unregister();
			}
		},

		register : function() {
			var observerService = Components.classes["@mozilla.org/observer-service;1"].
                             getService(Components.interfaces.nsIObserverService);
    
			observerService.addObserver(this, "em-action-requested", false);
			observerService.addObserver(this, "quit-application-granted", false);
		},

		unregister : function() {
			var observerService = Components.classes["@mozilla.org/observer-service;1"].
                             getService(Components.interfaces.nsIObserverService);
                                 
			observerService.removeObserver(this,"em-action-requested");
			observerService.removeObserver(this,"quit-application-granted");
		}
	 };
	 this.UninstallObserver._sltPrefs = this.sltPrefs;
	 
	 /*
	 this.pdfDownloadUrlBarListener = {
		_overlay : null,
		 
		QueryInterface: function(aIID) {
			if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
				aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
				aIID.equals(Components.interfaces.nsISupports))
					return this;
			throw Components.results.NS_NOINTERFACE;
		},

		onLocationChange: function(aProgress, aRequest, aURI) {
			//dump("pdfDownloadUrlBarListener.onLocationChange start\n");
			if (this._overlay.isFirstPDFDownloadInstallation()) {
				//dump("removeProgressListener\n");
				getBrowser().removeProgressListener(this);
			}
			//dump("pdfDownloadUrlBarListener.onLocationChange end\n");
		},

		onStateChange: function() {},
		onProgressChange: function() {},
		onStatusChange: function() {},
		onSecurityChange: function() {},
		onLinkIconAvailable: function() {}
	 };
	 this.pdfDownloadUrlBarListener._overlay = this;
	 */

	 this.openInNewTab = function(url) {
		var aTab = getBrowser().addTab(url);
		getBrowser().selectedTab = aTab;
	 };

	 this.isFirstPDFDownloadInstallation = function() {
		//dump("PDFDownloadOverlay.isFirstPDFDownloadInstallation - call\n");
		//dump(this);
		//dump("\n");
		var version = NitroPDF.PDFDownload.Shared.getVersion();
		var gOverlay = this;   
		if (this.sltPrefs.getBoolPref("extensions.pdfdownload.firstInstallation")) {
			this.sltPrefs.setBoolPref("extensions.pdfdownload.firstInstallation", false);
			this.sltPrefs.setCharPref("extensions.pdfdownload.last-version", version);
				setTimeout(function() {gOverlay.openInNewTab("http://www.nitropdf.com/pdfdownload/welcome.asp")}, 0);
				return true;
		} else {
			var lastVersion = "1.0";
			try {
				lastVersion = this.sltPrefs.getCharPref("extensions.pdfdownload.last-version");
			}catch(e) {}
			if (lastVersion != version) {
				this.sltPrefs.setCharPref("extensions.pdfdownload.last-version", version);
				setTimeout(function() {gOverlay.openInNewTab("http://www.nitropdf.com/pdfdownload/update.asp")}, 0);
			}
		}
		return false;
	 };

	 this.checkPDFDownloadContextMenu = function() {
		if (gContextMenu != null) {   
			var display = !(gContextMenu.inDirList || gContextMenu.onTextInput || gContextMenu.onLink ||
						gContextMenu.isContentSelected || gContextMenu.onImage || gContextMenu.onCanvas);
			gContextMenu.showItem("context-pdfdownload-savepdf", display);
		}
	 };
	 
	 this.disablePDFPlugin = function() {
		// disable the pdf plug-in (if exists)
		var disabled = this.mimeType;
		if (this.sltPrefs.prefHasUserValue(this.kDisabledPluginTypesPref)) {
			disabled = this.sltPrefs.getCharPref(this.kDisabledPluginTypesPref);
			if (disabled.indexOf(this.mimeType) == -1) {
				if (disabled == "") {
					disabled = this.mimeType;
				} else {
					disabled += "," + this.mimeType;
				}
			}
		}
		this.sltPrefs.setCharPref(this.kDisabledPluginTypesPref, disabled);   

		var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
		catman.deleteCategoryEntry("Gecko-Content-Viewers", this.mimeType, false);
	 };

	 this.enablePDFPlugin = function() {
		if (this.sltPrefs.prefHasUserValue(this.kDisabledPluginTypesPref)) {
			var disabledList = this.sltPrefs.getCharPref(this.kDisabledPluginTypesPref);
			if (disabledList == this.mimeType)
				this.sltPrefs.clearUserPref(this.kDisabledPluginTypesPref);
			else {
				var disabledTypes = disabledList.split(",");
				var disabled = "";
				for (var i = 0; i < disabledTypes.length; ++i) {
					if (this.mimeType != disabledTypes[i])
						disabled += disabledTypes[i] + (i == disabledTypes.length - 1 ? "" : ",");
				}

				this.sltPrefs.setCharPref(this.kDisabledPluginTypesPref, disabled);
			}
		}
     
		// Also, we update the category manager so that existing browser windows
		// update.
		var catman = Components.classes["@mozilla.org/categorymanager;1"]
								.getService(Components.interfaces.nsICategoryManager);
		catman.addCategoryEntry("Gecko-Content-Viewers", this.mimeType,
								this.kPluginHandlerContractID, false, true);
	 };
	 
	 this.init = function() {
		//dump("INIT LOAD EVENT START\n");
		this.sltPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		this.bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
		this.pdfDownloadBundle = this.bundleService.createBundle("chrome://pdfdownload/locale/pdfdownload.properties");

		this.disablePDFPlugin();
		this.removeDownloadedFiles();

		var thisReference = this;
		
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing"
										   , function () { thisReference.checkPDFDownloadContextMenu() }
										   , false);
		
		// Place the button just at the end of the navigation bar, only if it is 
		// the first time 
		var navbar = document.getElementById("nav-bar");
		if ((NitroPDF.PDFDownload.Shared.checkSavePDFBtnInstalled() == false) &&
			(navbar != null && document.getElementById("pdfDownload-button") == null)) {
				var newset;
				if (navbar.getAttribute('currentset') && 
					navbar.getAttribute('currentset').indexOf('pdfDownload-button') == -1) {
						navbar.insertItem ('pdfDownload-button', null, null, false);
						newset = navbar.getAttribute('currentset') + ',pdfDownload-button';
						navbar.setAttribute('currentset', newset);
						document.persist('nav-bar', 'currentset');
				}
				else if (!navbar.getAttribute('currentset')) {
					navbar.insertItem ('pdfDownload-button', null, null, false);
					newset=navbar.getAttribute('defaultset') + ',pdfDownload-button';
					navbar.setAttribute('currentset', newset);
					document.persist('nav-bar', 'currentset');
				}
		}
		
		getBrowser().addEventListener("click", 
									  function (event) { thisReference.mouseClick(event) },
									  true);
								  
		gBrowser.mTabContainer.addEventListener("TabClose", function (event) { thisReference.onTabHasBeenRemoved(event) }, false);

		//window.addEventListener("load", this.init, true);

		try {
			//legacy options
			this.retrieveLegacyOptions();
		} catch(ex) {}

		document.getElementById("menu_ToolsPopup").addEventListener("popupshowing"
									    , function () { NitroPDF.PDFDownload.Shared.togglePDFDownloadToolsItem() }
									    , false);
		document.getElementById("menu_FilePopup").addEventListener("popupshowing"
									   , function () { NitroPDF.PDFDownload.Shared.togglePDFDownloadFileItem() }
									   , false);
		//getBrowser().addProgressListener(thisReference.pdfDownloadUrlBarListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
	
		this.togglePDFDownloadEnableDisableIcon();
	
		this.addressChangedEventHandler.init(thisReference);
	
		//add download observer
		this.initDownloadObserver();
		//register the uninstall observer
		this.UninstallObserver.register();
		//alert('Set up');
		
		//dump("remember overlay to NitroPDFDownload.AddonManagerWrapper\n");
		NitroPDFDownload.AddonManagerWrapper.SetOverlay(this);
		
		//dump("removeEventListener - load\n");
		window.removeEventListener("load", function (){ pdfDownloadAddonOverlay.init() }, false);

		//dump("INIT LOAD EVENT END\n");
	 };

	 this.uninit = function() {		
		this.unloadDownloadObserver();
	
		var thisReference = this;
		
		//getBrowser().removeProgressListener(thisReference.pdfDownloadUrlBarListener);
		getBrowser().removeEventListener("click", 
										 function (event) { thisReference.mouseClick(event) }, 
										 true);
		if (document.getElementById("contentAreaContextMenu") != null) {
			document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", function () { thisReference.checkPDFDownloadContextMenu() }, false);
		}
		if (document.getElementById("menu_ToolsPopup") != null) {
			document.getElementById("menu_ToolsPopup").removeEventListener("popupshowing", function () { NitroPDF.PDFDownload.Shared.togglePDFDownloadToolsItem() }, false);
		}
		if (document.getElementById("menu_FilePopup") != null) {
			document.getElementById("menu_FilePopup").removeEventListener("popupshowing", function () { NitroPDF.PDFDownload.Shared.togglePDFDownloadFileItem() }, false);
		}
		//window.removeEventListener("load", this.init, false);
		//register the uninstall observer
		this.UninstallObserver.unregister();

		this.addressChangedEventHandler.uninit();
	
		this.enablePDFPlugin();
		
		//dump("removeEventListener - unload\n");
		window.removeEventListener("unload", function () { this.uninit() }, false);
				
		pdfDownloadService.unregister();
		//alert('Tear down');			
	 };
	 
	 this.setStatusBarButtonIcon = function(isAddonDisabled) {
		var strings = document.getElementById("pdfdownloadStrings");
		var iconPath = isAddonDisabled ? strings.getString("addonDisabledIconPath") : strings.getString("addonEnabledIconPath");
		var statusBarButtonIcon = document.getElementById("statusBarButtonIcon");
	
		statusBarButtonIcon.src = iconPath;
	 };
 
	 this.onAddSiteToBanListMenuItemClick = function() {
		var preferencesString = this.getExclusionList();
		var siteUrlBase = this.parseUrl(this.getCurrentLocation());
		
		if (preferencesString.search(siteUrlBase) == -1) {
			preferencesString = preferencesString.concat(";" + siteUrlBase);
		
			var preferencesService  = Components.classes["@mozilla.org/preferences-service;1"].
									getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");
							
			preferencesService.setCharPref("exclusionListPref", preferencesString);
		}
	 };
	 
	 this.isSiteAvailable = function(siteUrl) {
		var siteUrlBase = this.parseUrl(siteUrl);
		var preferencesString = this.getExclusionList();
		
		if (preferencesString.search(siteUrlBase) != -1) {
			// a site is in Exclusion list
			return false;
		}
	
		return true;
	 };
 
	 this.getExclusionList = function() {
		var preferencesService  = Components.classes["@mozilla.org/preferences-service;1"].
									getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");
		var preferencesString = "";
		try {
			preferencesString = preferencesService.getCharPref("exclusionListPref");
		} catch(ex) { }
	
		return preferencesString;
	 };
 
	 this.parseUrl = function(siteUrl) {
		const protocolPrefix = "://";//"http://";
		var parsingResult = "";
	 
		var protocolPrefixIndex = siteUrl.search(protocolPrefix);
		if (protocolPrefixIndex != -1) {
			protocolPrefixIndex += protocolPrefix.length;
			var nextSlashIndex = siteUrl.indexOf('/', protocolPrefixIndex);
			if (nextSlashIndex != -1) {
				parsingResult = siteUrl.substr(protocolPrefixIndex, nextSlashIndex - protocolPrefixIndex);
			} else {
				parsingResult = siteUrl.substr(protocolPrefixIndex, siteUrl.length - protocolPrefixIndex - 1);
			}
		} else {
			parsingResult = siteUrl;
		}
	 
		const wwwDomain = "www";
		var wwwDomainIndex = parsingResult.indexOf(wwwDomain);
		if (wwwDomainIndex != -1) {
			var startingIndex = wwwDomainIndex + wwwDomain.length + 1;
			parsingResult = parsingResult.substr(startingIndex, parsingResult.length - startingIndex);
		}
	 
		return parsingResult;
	 };
 
	 // if user navigates to a new site then enable an addon by default
	 this.navigateUrl = function(url) {
		var urlBase = this.parseUrl(url);
	 
		for (i = 0; i < this.sitesWithDisabledAddon.length; i++) {
			if (urlBase == this.sitesWithDisabledAddon[i]) {
				this.setOpenedSite(this.sitesWithDisabledAddon[i], true);
				return;
			}
		}
	 
		if (this.openedSite.url != urlBase) {
			this.setOpenedSite(urlBase, !this.isSiteAvailable(url));
		}	 	 
	 };

	this.setOpenedSite = function(siteUrl, addonDisabled) {
		this.openedSite.url = siteUrl;
		this.openedSite.isAddonDisabled = addonDisabled;
	
		this.setStatusBarButtonIcon(this.openedSite.isAddonDisabled);
	 };
 
	 this.onTabHasBeenRemoved = function(event) {
		// a closing tab
		var browser = event.target.linkedBrowser;
		// a site that is opened in a closing tab
		var closingTabUrl = this.parseUrl(browser.currentURI.spec);
	
		this.removeSiteFromDisabledSitesList(closingTabUrl);
	 };
 
	 this.removeSiteFromDisabledSitesList = function(siteUrl) {
		//alert('Remove site from list');
		var tempArray = new Array();
		for (i = 0; i < this.sitesWithDisabledAddon.length; i++) {
			if (siteUrl != this.sitesWithDisabledAddon[i]) {
				tempArray[i] = this.sitesWithDisabledAddon[i];
			}
		}
	
		this.sitesWithDisabledAddon = tempArray;
		//alert(this.sitesWithDisabledAddon);
	 };
 
	 this.tabHasBeenSelected = function() {
		this.navigateUrl(this.getCurrentLocation());
	 }
	 
	 this.togglePDFDownloadEnableDisableIcon = function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                               .getService(Components.interfaces.nsIPrefBranch);
			
		
		if (true == prefs.getBoolPref("extensions.pdfdownload.showEnableDisableIcon")) {
			document.getElementById("pdfdownload-statusbarpanel").hidden = false;
		} else {
			document.getElementById("pdfdownload-statusbarpanel").hidden = true;
		}			
	 };

	this.addressChangedEventHandler = {
		oldURL: null,
		overlay: null,		
  
		pdfDownloadAddressChangedListener: {
			addressChangedHandler : null,
		 
			QueryInterface: function(aIID) {
				if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
					aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
					aIID.equals(Components.interfaces.nsISupports))
						return this;
				throw Components.results.NS_NOINTERFACE;
			},

			onLocationChange: function(aProgress, aRequest, aURI) {
				this.addressChangedHandler.processNewURL(aURI);
			}
		},
			
		init: function(overlayObject) {
			this.overlay = overlayObject;
			this.pdfDownloadAddressChangedListener.addressChangedHandler = this;
			// Listen for webpage loads
			gBrowser.addProgressListener(this.pdfDownloadAddressChangedListener,
				Components.interfaces.nsIWebProgress.NOTIFY_LOCATION);
		},
  
		uninit: function() {
			gBrowser.removeProgressListener(this.pdfDownloadAddressChangedListener);
		},

		processNewURL: function(aURI) {
			if (aURI.spec == this.oldURL)
				return;
    
			this.overlay.navigateUrl(aURI.spec);
    
			this.oldURL = aURI.spec;
		}
	 };
		 
	 function PDFDownloadService(pdfDownloadOverlay) {
		//dump("PDFDownloadService\n");
		this.overlay = pdfDownloadOverlay;
		this.register();	
	 };

	 PDFDownloadService.prototype = {
		overlay : null,

		QueryInterface: function(aIID) {
			//dump("QueryInterface\n");
			if (aIID.equals(Components.interfaces.nsIURIContentListener) ||
				aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
				aIID.equals(Components.interfaces.nsISupports))
					return this;
     
			throw Components.results.NS_NOINTERFACE;	
		 },
			 
		register: function() {
			//dump("register\n");
			Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader).registerContentListener(this);
		},
			
		unregister: function() {
			//dump("unregister\n");
			Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader).unRegisterContentListener(this);
		},
			
		checkContentType: function(contentType) {
			//dump("checkContentType\n");
			if ((this.overlay.mimeType == contentType) || ("application/x-pdf" == contentType))
				return true;
			return false;
		},
			
		canHandleContent: function(contentType, isContentPreferred, desiredContentType) {
			//dump("canHandleContent\n");
			return this.checkContentType(contentType);
		},
			
		isPreferred: function(contentType, desiredContentType) {
			//dump("isPreferred\n");
			return this.checkContentType(contentType);
		},
			
		onStartURIOpen: function(uri) {
			//dump("onStartURIOpen\n");
			return false;
		},
			
		doContent: function(contentType, isContentPreferred, channel, contentHandler) {
			//alert('Do content');
			// this is not our mode
			//dump("doContent start\n");
			if (this.overlay.isMouseClickMode()) {
				//dump("overlay.isMouseClickMode true\n");
				contentHandler = 0;
				//dump("doContent return false\n");
				return false;
			}
			//dump("overlay.isMouseClickMode false\n");

			const ci=Components.interfaces;
			channel.QueryInterface(ci.nsIChannel);

			// get information about the request
			//dump("get information about the reques\n");
			var url = channel.URI.spec;
			var size = channel.contentLength;
    
			//dump("channel.QueryInterface(ci.nsIHttpChannel)\n");
			var http = channel.QueryInterface(ci.nsIHttpChannel);
			var filename = this.overlay.getHttpRequestFileName(http);

			//dump("do not process POST requests\n");
			// do not process POST requests	
			if ('POST' == http.requestMethod) {
				contentHandler = 0;
				return false;
			}
	
			if (this.overlay.openedSite.isAddonDisabled || !this.overlay.isSiteAvailable(url)) {
				// a site in an Exclusion list - do default action
				contentHandler = 0;
				return false;
			}
	
			// stop this download
			this.overlay.getMostRecentBrowser().stop();
			channel.cancel(Components.results.NS_BINDING_ABORTED);     
    
			// handle the download
			this.chooseWhatToDo(url, size, filename);

			contentHandler.value=null;
			//dump("doContent end\n");
			return true;
		},
			
		chooseWhatToDo: function(url, size, filename) {
			//dump("chooseWhatToDo\n");
			var answer = new Object();
	
			answer.res = "cancel";
			answer.url = url;	
			answer.filesize = size;
			answer.res = this.overlay.getSetting("defaultAction", "showPopup");
	
			this.overlay.handlePDF(answer, 'pdf', url, filename);
		}
	 };
	 
	 pdfDownloadService = new PDFDownloadService(this);
	 
	 //dump("PDFDownloadOverlay function - end\n");
 }
 
 /*
	PDF Download overlay object
 */
 var pdfDownloadAddonOverlay = new PDFDownloadNamespace.PDFDownloadOverlay();

//do the init on load
window.addEventListener("load", function (){ pdfDownloadAddonOverlay.init() }, false);
//do the unload
window.addEventListener("unload", function () { pdfDownloadAddonOverlay.uninit() }, false);
// listen a tab removing event
//gBrowser.mTabContainer.addEventListener("TabClose", function () { pdfDownloadAddonOverlay.onTabHasBeenRemoved() }, false);
 
  
/******************************************************************************
 *                        				CONSTANTS                             *
 *****************************************************************************/
/*const kPluginHandlerContractID = "@mozilla.org/content/plugin/document-loader-factory;1";
const pBranch = Components.interfaces.nsIPrefBranch;
const kDisabledPluginTypesPref = "plugin.disable_full_page_plugin_for_types";

const fileCID  = "@mozilla.org/file/local;1";
const fileIID  = Components.interfaces.nsILocalFile;
const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
const mimeType = "application/pdf";
const sPrefPrefix = "extensions.pdfdownload.";
const viewOnlineURL = "http://www.pdfdownload.org/pdf2html/pdf2html_vuzit.php";*/

/******************************************************************************
 *                        				VARIABLES                             *
 *****************************************************************************/
/*var sltPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(pBranch);

var bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                          .getService(Components.interfaces.nsIStringBundleService);

var bundle = bundleService.createBundle("chrome://pdfdownload/locale/pdfdownload.properties");*/

//var downloadQueue = new Array();

/*var openedSite = {

	url: "",
	isAddonDisabed: ""
};

// stores disabled sites URLs
var sitesWithDisabledAddon = new Array(); */

/******************************************************************************
 *                        	HELPFUL FUNCTIONS                                 *
 *****************************************************************************/
 
/* 
String.prototype.trimSpace = function() {
	return this.replace(/^\s+|\s+$/g, '');
}
 
String.prototype.trimQuotes = function() {
	return this.replace(/^\"+|\"+$/g, '');
}
*/
 
// get URL of the focuced window
/*function getCurrentLocation() {
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
function savelink(url, filename)
{
    var ifi = initFileInfo;
   	var ogdfn = getDefaultFileName;

    initFileInfo = function(aFI, aURL, aDocument, aContentType, aContentDisposition)
    {
    	var pos = aURL.lastIndexOf('.');
    	var ext = aURL.substring(pos).toLowerCase();
    	
    	if (ext == '.pdf')
    	{
    		ifi(aFI, aURL, aDocument, aContentType, aContentDisposition);
    	}
    	else
    	{
			var npos = aURL.lastIndexOf('/');
			var name = aURL.substring(npos+1, pos);
			
			if (filename != null) {
				name = filename;
			}
			
        	aFI.uri = makeURI(aURL);
        	aFI.fileName = name;
        	aFI.fileExt = 'pdf';
        	aFI.fileBaseName = name;
        }
    }

    saveURL(url, null, null, true, true, makeURI(url));

    initFileInfo = ifi;
    getDefaultFileName = ogdfn;
}*/


/*function getMostRecentBrowserWindow()
{
	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
	var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
	
	return windowManagerInterface.getMostRecentWindow( "navigator:browser" );
}

function getMostRecentBrowser()
{
	return getMostRecentBrowserWindow().getBrowser();
}*/


/*function loadNewTabURI(url)
{
	var tab = getMostRecentBrowser().addTab(url);

	if (shouldNewTabFocused()) {
		getBrowser().selectedTab = tab;
	}
}

		
function loadNewWindowURI(url)
{
	loadNewTabURI(url);
	//openNewWindowWith(url, null, null);
}*/
		
/**
 * Extract file anme from HTTP header
 *//*
function getHttpRequestFileName(http)
{
try {
	var fname = http.getResponseHeader("Content-Disposition");
	var parts = fname.split(';');
    	
	for(var i=0; i<parts.length; i++) {
		var line = parts[i].trimSpace();

   		if ("filename=" == line.substring(0, 9)) {
   			var filename = line.substring(9).trimQuotes();
   			
   			if (filename.length > 0) {
   				return filename;
   			}
   		}
    }
}
catch(ex) {
	// no nothing
}

return null;
}*/


/******************************************************************************
 *                        	get settings                                  *
 *****************************************************************************/
/*function getAbsSetting(name, defvalue)
{
	var value = defvalue;

	try {
		value = sltPrefs.getCharPref(name);
	} catch(ex) {
	}

	return value;
}

function getAbsBoolSetting(name, defvalue)
{
	var value = defvalue;

	try {
		value = sltPrefs.getBoolPref(name);
	} catch(ex) {
	}

	return value;
}


function getSetting(name, defvalue)
{
	return getAbsSetting(sPrefPrefix + name, defvalue);
}

function getBoolSetting(name, defvalue)
{
	return getAbsBoolSetting(sPrefPrefix + name, defvalue)
}


function isMouseClickMode()
{
	var defvalue = "name";
	var value = getSetting("clickMode", defvalue);
	
	return (value == defvalue);
}

function shouldNewTabFocused()
{
	return !getAbsBoolSetting("browser.tabs.loadInBackground", true);
}*/

/******************************************************************************
 *                        	Handle download request                           *
 *****************************************************************************/
/*function PDFDownloadService() {
	this.register();	
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
  register: function() {
    Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader).registerContentListener(this);
  }
,
  unregister: function() {
    Components.classes["@mozilla.org/uriloader;1"].getService(Components.interfaces.nsIURILoader).unRegisterContentListener(this);
  }
,
  checkContentType: function(contentType) {
    if ((contentType == mimeType) || (contentType == "application/x-pdf"))
    	return true;
    return false;
  }
, 
  canHandleContent: function(contentType, isContentPreferred, desiredContentType) {
    return this.checkContentType(contentType);
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
  doContent: function(contentType, isContentPreferred, channel, contentHandler) {

	// this is not our mode
	if (this.isMouseClickMode()) {
		contentHandler = nsnull;
		return false;
	}

    const ci=Components.interfaces;
    channel.QueryInterface(ci.nsIChannel);

	// get information about the request
    var url = channel.URI.spec;
    var size = channel.contentLength;
    
	var http = channel.QueryInterface(ci.nsIHttpChannel);
	var filename = this.getHttpRequestFileName(http);

	// do not process POST requests	
	if ('POST' == http.requestMethod) {
		contentHandler = nsnull;
		return false;
	}
	
	//navigateUrl(url);
	
	if (this.openedSite.isAddonDisabled || !this.isSiteAvailable(url)) {
	
		// a site in an Exclusion list - do default action
		contentHandler = nsnull;
		return false;
	}
	
	// stop this download
	this.getMostRecentBrowser().stop();
    channel.cancel(Components.results.NS_BINDING_ABORTED);     
    
	// handle the download
	this.chooseWhatToDo(url, size, filename);

	contentHandler.value=null;

	return true;
  }
,
  chooseWhatToDo: function(url, size, filename) {
   
	var answer = new Object();
	
	answer.res = "cancel";
	answer.url = url;	
	answer.filesize = size;
    answer.res = this.getSetting("defaultAction", "showPopup");
	
	this.handlePDF(answer, 'pdf', url, filename);
  }
}*/

//var pdfDownloadService = new PDFDownloadService();


/******************************************************************************
 *                        	handle the click event                           *
 *****************************************************************************/
/*function mouseClick(aEvent) {
	
	var globalHistory = Components.classes["@mozilla.org/browser/global-history;2"]
	                                       .getService(Components.interfaces.nsIBrowserHistory);
	if (!isMouseClickMode()) {
		// this is not our mode
		return;
	}

	if (!aEvent) {
		
		return;
	}

	// if right click, we do not do anything
	if (aEvent.button == 2)
		return;

	// if Shift key and Ctrl key were pressed, it means that the user wants to open the PDF file without "PDF Download"
	if (aEvent.shiftKey && aEvent.ctrlKey) 
		return;

	if (aEvent.target)
		var targ = aEvent.originalTarget;

	/* BEGIN of the code taken by an extension written by Ben Basson (Cusser)  *//*
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
	/* END of the code taken by an extension written by Ben Basson (Cusser) *//*

	var url = targ.getAttribute("href");	
	if (url == null) return;

    // remove heading spaces
    url = url.replace(/^\s+/, '');
   
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
	if (url.toLowerCase().indexOf('javascript:') != -1)
		return;

	//retrieve the url from a google link
	if ((url.match(/^http:\/\/[a-z.]+google.[a-z.]+\/url\?/i)) && (url.match(/[\\?&]url=([^&#]+)/i))) {
		url = decodeURIComponent(RegExp.$1);
	}
    // special case for yahoo search results
    if (url.match(/^http:\/\/[a-z.]+yahoo.[a-z.]+\//i) && (url.match(/\/\*\*([^&#]+)/i))) {
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
		answer.res = getSetting("defaultAction", "showPopup");

		// get a file size
		var httpRequest = new XMLHttpRequest();
		httpRequest.open("HEAD", originalUrl, false);
		httpRequest.send(null);
		
		if (200 == httpRequest.status) {
			
			// all is ok a file size can be read
			
			var contentLength = httpRequest.getResponseHeader("Content-Length");
			answer.filesize = contentLength;
		}
		
		//navigateUrl(url);
		
		if (/*!isSiteAvailable(url) || *//*openedSite.isAddonDisabled || !isSiteAvailable(url)/*isAddonDisabled*//*) {

			// a site in an Exclusion list - do default action
			answer.res = "openWithoutExtension";
		}
		else {
		
			handlePDF(answer, ext, url, null);	
		}
        
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
}*/

/******************************************************************************
 *                        	handle PDF download                               *
 *****************************************************************************/
/*function handlePDF(params, ext, normalizedUrl, filename) {
		
    	if ((params.res == "showPopup") || 
			((params.res == "openHtml") && ((params.url.indexOf("//localhost") != -1) || (params.url.indexOf("//127.0.0.1") != -1)))) {
			getMostRecentBrowserWindow().openDialog("chrome://pdfdownload/content/questionBox.xul", "PDF Download", "chrome,modal,centerscreen,dialog", params, ext);
		} 
		
        var isLocalFile = isLinkType("file:",params.url);
        var fname = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
		var openPDF = "";
		
		if (filename != null) {
			fname = filename;
		} 
		else {
	    		var pos = fname.lastIndexOf('.');
	    		var ext = fname.substring(pos).toLowerCase();
    	
		    	if (ext != '.pdf') {
				fname = fname.substring(0, pos) + '.pdf';
			}
		}
		
		if (params.res == "download") {
            if (isLocalFile) {
                var localTarget = buildLocalTarget(fname);
                if (localTarget != null) {
			        copyFile(params.url,localTarget.path);
                }
            } else {
                savelink(params.url, filename);
            }
        } else if (params.res == "openWithoutExtension") {
        	openPDFWithPlugin(params.url);
		} else if (params.res == "open") {
			// we check how to open the PDF
			openPDF = getSetting("openPDF", "");

			
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
		} else if (params.res == "viewOnline") {
            if (isLocalFile) {
                // since we are dealing with a local file, we cannot use the "View as HTML" option
                params.res = "showPopup";
                handlePDF(params,ext,normalizedUrl);
            } else {
			    //var prefvalue = getSetting("openPDFtoHTML", "openHTMLNewTab");
				var prefvalue = getSetting("viewPDFOnline", "viewingPDFNewTab");
			    var url = viewOnlineURL + "?url=" + encodeURIComponent(params.url);
			    				
				if (prefvalue == "viewingPDFNewTab") {
					loadNewTabURI(url);
				//} else if (prefvalue == "openHTMLNewWindow") {
				//	loadNewWindowURI(url);
				} else {
					getBrowser().loadURI(url); // Just do a normal load.
				}
            }            
		}
}*/

/*function openPDFWithPlugin(url) {
    /*
	 * In the preferences there was written to open the PDF file using the PDF plugin.
	 * Now we check in which tab/window we must open the PDF file using the PDF plugin.
	 */	/*	
	var prefvalue = getSetting("openPDFLink", "openPDFNewTab");

	enablePDFPlugin();

	if (prefvalue == "openPDFNewTab") {
		loadNewTabURI(url);
	} else if (prefvalue == "openPDFNewWindow") {
		loadNewWindowURI(url);
	} else {
		getBrowser().loadURI(url);
	}     

    setTimeout(function() {
    	disablePDFPlugin();
    }, 1000);
//	
}*/

//function taken from old contentAreaUtils.js and fixed up a little bit 
//to support Firefox 1.5
/*function markLinkVisited(href, linkNode,referrer)
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
}*/

/*function buildLocalTarget(fileName) {
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
	appendFiltersForContentType(fp, mimeType, "pdf", SAVEMODE_FILEONLY);
	var res = fp.show();
	if (res == Components.interfaces.nsIFilePicker.returnOK) {
	    file.initWithPath(getNormalizedLeafName(fp.file.path,"pdf"));
          //file.append(fileName);
	    return file;
      } 

	return null;
}*/

/*function makeURL(aURL)
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
		localTarget.append(createNumber(i) + "_" + newFileName);
  	}
  	aFile.copyTo(aDest,localTarget.leafName);
 }*/
 

//we find which mirror is better to use to do the PDF->HTML conversion
/*function getMirror(url,filesize) {
	var http;
	try {
		http = new XMLHttpRequest();
	} catch (e) {
		http = false
	}
	if (http) {
		// this is the server-side script that handle the mirror list
		var uri = "http://pdf2html.nitropdf.com/getmirror.asp?filesize="+filesize;
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
							loadNewTabURI(pdf2htmlUrl);
						} else if (prefvalue == "openHTMLNewWindow") {
							loadNewWindowURI(pdf2htmlUrl);
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
    var todayDir = "pdfdownload-"+NitroPDF.PDFDownload.Shared.getTodayDate();
	var localTarget = NitroPDF.PDFDownload.Shared.getPDFDownloadTempDir();
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

}*/

//Opens the pdf file with an external program (the os default one or the one specified by the user under the PDF Download options)
/*function openPDFExternally(filename) {
	var oFile 	= Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
	oFile.initWithPath(filename);
	if (oFile != null && oFile.exists()) {
		var pdfViewerPath = getSetting("pdfViewerPath", "");
		var openPDF = getSetting("openPDF", "");

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
					 *//*
					window.openDialog("chrome://pdfdownload/content/osWarning.xul","pdfdownload-OS-warning-window","centerscreen,chrome,modal");
					showPDFDownloadSettings();

					openPDF = getSetting("openPDF", "defaultViewer");
					pdfViewerPath = getSetting("pdfViewerPath", "");
				}
			}
		} 
		if (openPDF == "customViewer") {
			// In the preferences there was written to open PDF files using a custom viewer
			var absoluteFileName = NitroPDF.PDFDownload.Shared.resolveFileName(pdfViewerPath);
			
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
}*/

/*function openExternal(aFile)
{
   var uri = Components.classes["@mozilla.org/network/io-service;1"]
                       .getService(Components.interfaces.nsIIOService)
                       .newFileURI(aFile);
 
   var protocolSvc = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
					.getService(Components.interfaces.nsIExternalProtocolService);
 
   protocolSvc.loadUrl(uri);
   return;
}*/

//Checks the type of a link
/*function isLinkType (linktype, link) {
	try {
		var protocol = link.substr(0, linktype.length);
		return protocol.toLowerCase() == linktype;
	} catch(e) {
		return false;
	}
}


function makeFileURI(aFile)
{
	var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	return ioService.newFileURI(aFile);
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
}*/

//shows the options dialog for PDF Download
/*function showPDFDownloadSettings() {
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
}*/


/*function retrieveLegacyOptions() {
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
}*/

	
/*
 *  Download manager listener part
 */

//Adds download listener
/*function initDownloadObserver() {

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
    var todayDir = "pdfdownload-"+NitroPDF.PDFDownload.Shared.getTodayDate();
	var tempDir = NitroPDF.PDFDownload.Shared.getPDFDownloadTempDir();
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
}*/

/*function generatePDFFromPage() {
    var action = getSetting("webToPDF.action", "askEmail");
    generatePDFFromPageWithAction(action);
}
 
function generatePDFFromPageWithAction(action) {
    var saveAsPdfUrl = "http://www.pdfdownload.org/web2pdf/Default.aspx?";
    var currentUrl = gBrowser.selectedBrowser.currentURI.spec;
    var top = 0.5;
    var bottom = 0.5;
    var left = 0.5;
    var right = 0.5;
    var pageOrientation = 0; // portrait
    
    try {
        top = sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.top");
    } catch (e) {}
    try {
        bottom = sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.bottom");
    } catch (e) {}
    try {
        left = sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.left");
    } catch (e) {}
    try {
        right = sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.margins.right");
    } catch (e) {}
    
    try {
        pageOrientation = sltPrefs.getCharPref("extensions.pdfdownload.webToPDF.pageOrientation");
    } catch (e) {}
    saveAsPdfUrl = saveAsPdfUrl + "page="+pageOrientation+"&top="+top+"&bottom="+bottom+"&left="+left+"&right="+right+"&cURL="+encodeURIComponent(currentUrl);
    if (action == "download") {
        var tab = getBrowser().addTab(saveAsPdfUrl);
        getBrowser().selectedTab = tab;
    } else {
      	var emailAddress = getSetting("webToPDF.emailAddress", "");
        var validEmail = NitroPDF.PDFDownload.Shared.validateEmail(emailAddress);

        if (action == "sendEmail" && validEmail) {
            saveAsPdfUrl = saveAsPdfUrl + "&email=" + emailAddress;
            var tab = getBrowser().addTab(saveAsPdfUrl);
            getBrowser().selectedTab = tab;
        } 
        if (action == "askEmail" || !validEmail) {
          var param = new Object();
          param.defaultValue = null;
          window.openDialog("chrome://pdfdownload/content/emailDialog.xul", "pdfdownloadEmailDialog", "centerscreen,chrome,modal",param);
          if (param.res == true) {
            var emailAddress = param.inputSubmitted;
            saveAsPdfUrl = saveAsPdfUrl + "&email=" + emailAddress;
            var tab = getBrowser().addTab(saveAsPdfUrl);
            getBrowser().selectedTab = tab;
          }
        } 
    }
}*/


/******************************************************************************
 *                    LISTENER FOR UNINSTALL OF PDF DOWNLOAD                  *
 ******************************************************************************/

/*var UninstallObserver = {
    _uninstall : false,
    
    observe : function(subject, topic, data) {
      if (topic == "em-action-requested") {
        subject.QueryInterface(Components.interfaces.nsIUpdateItem);
    
        if (subject.id == NitroPDF.PDFDownload.Shared.getUuid()) {
          if (data == "item-uninstalled") {
            this._uninstall = true;
          } else if (data == "item-cancel-action") {
            this._uninstall = false;
          }
        }
      } else if (topic == "quit-application-granted") {
        if (this._uninstall) {
          sltPrefs.clearUserPref("extensions.pdfdownload.firstInstallation");
        }
        this.unregister();
      }
    },

    register : function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"].
                             getService(Components.interfaces.nsIObserverService);
    
      observerService.addObserver(this, "em-action-requested", false);
      observerService.addObserver(this, "quit-application-granted", false);
    },

    unregister : function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"].
                             getService(Components.interfaces.nsIObserverService);
                                 
      observerService.removeObserver(this,"em-action-requested");
      observerService.removeObserver(this,"quit-application-granted");
    }
}*/

/******************************************************************************
 *                        LISTENER FOR THE URL CHANGE                         *
 ******************************************************************************/

/*var pdfDownloadUrlBarListener = {
  QueryInterface: function(aIID)
  {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  onLocationChange: function(aProgress, aRequest, aURI)
  {
    if (isFirstPDFDownloadInstallation()) {
       getBrowser().removeProgressListener(pdfDownloadUrlBarListener);
       //setTimeout(function() { openInNewTab("http://www.nitropdf.com/pdfdownload/welcome.asp"); }, 0);    
    }
  },

  onStateChange: function() {},
  onProgressChange: function() {},
  onStatusChange: function() {},
  onSecurityChange: function() {},
  onLinkIconAvailable: function() {}
};

function openInNewTab(url) {
	var aTab = getBrowser().addTab(url);
	getBrowser().selectedTab = aTab;
}

function isFirstPDFDownloadInstallation() {
    var version = NitroPDF.PDFDownload.Shared.getVersion();
	if (sltPrefs.getBoolPref("extensions.pdfdownload.firstInstallation")) {
		sltPrefs.setBoolPref("extensions.pdfdownload.firstInstallation", false);
		sltPrefs.setCharPref("extensions.pdfdownload.last-version", version);
        setTimeout(function() {openInNewTab("http://www.nitropdf.com/pdfdownload/welcome.asp")}, 0);
		return true;
	} else {
		var lastVersion = "1.0";
		try {
			lastVersion = sltPrefs.getCharPref("extensions.pdfdownload.last-version");
		}catch(e) {}
		if (lastVersion != version) {
			sltPrefs.setCharPref("extensions.pdfdownload.last-version", version);
            setTimeout(function() {openInNewTab("http://www.nitropdf.com/pdfdownload/update.asp")}, 0);
		}
	}
	return false;
}

function checkPDFDownloadContextMenu() {
    if (gContextMenu != null) {   
        var display = !(gContextMenu.inDirList || gContextMenu.onTextInput || gContextMenu.onLink ||
                       gContextMenu.isContentSelected || gContextMenu.onImage || gContextMenu.onCanvas);
        gContextMenu.showItem("context-pdfdownload-savepdf", display);
    }
}*/

/******************************************************************************
 *                       Adope PDF plug-in function                           *
 *****************************************************************************/
/*function disablePDFPlugin() {
	// disable the pdf plug-in (if exists)
      var disabled = mimeType;
      if (sltPrefs.prefHasUserValue(kDisabledPluginTypesPref)) {
        disabled = sltPrefs.getCharPref(kDisabledPluginTypesPref);
        if (disabled.indexOf(mimeType) == -1) {
	    if (disabled == "") {
		 disabled = mimeType;
	    } else {
             disabled += "," + mimeType;
          }
	  }
      }
      sltPrefs.setCharPref(kDisabledPluginTypesPref, disabled);   

	var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
	catman.deleteCategoryEntry("Gecko-Content-Viewers", mimeType, false);
}

function enablePDFPlugin() {


     if (sltPrefs.prefHasUserValue(kDisabledPluginTypesPref)) {
       var disabledList = sltPrefs.getCharPref(kDisabledPluginTypesPref);
       if (disabledList == mimeType)
         sltPrefs.clearUserPref(kDisabledPluginTypesPref);
       else {
         var disabledTypes = disabledList.split(",");
         var disabled = "";
         for (var i = 0; i < disabledTypes.length; ++i) {
           if (mimeType != disabledTypes[i])
             disabled += disabledTypes[i] + (i == disabledTypes.length - 1 ? "" : ",");
         }

         sltPrefs.setCharPref(kDisabledPluginTypesPref, disabled);
       }
     }
     
     // Also, we update the category manager so that existing browser windows
     // update.
     var catman = Components.classes["@mozilla.org/categorymanager;1"]
                            .getService(Components.interfaces.nsICategoryManager);
     catman.addCategoryEntry("Gecko-Content-Viewers", mimeType,
                             kPluginHandlerContractID, false, true);
}*/


/******************************************************************************
 *                       Init and Uninit functions                           *
 *****************************************************************************/
/*function init() {

	alert('Addon started!!!');
	
	disablePDFPlugin();
    removeDownloadedFiles();
    
    document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", checkPDFDownloadContextMenu, false);
    // Place the button just at the end of the navigation bar, only if it is 
    // the first time 
    var navbar = document.getElementById("nav-bar");
    if ((NitroPDF.PDFDownload.Shared.checkSavePDFBtnInstalled() == false) &&
            (navbar != null && document.getElementById("pdfDownload-button") == null)) {
            var newset;
	        if (navbar.getAttribute('currentset') && 
                  navbar.getAttribute('currentset').indexOf('pdfDownload-button') == -1) {
                      
	            navbar.insertItem ('pdfDownload-button', null, null, false);
	            newset = navbar.getAttribute('currentset') + ',pdfDownload-button';
	            navbar.setAttribute('currentset', newset);
	            document.persist('nav-bar', 'currentset');
	        }
	        else if (!navbar.getAttribute('currentset')) {
                
	            navbar.insertItem ('pdfDownload-button', null, null, false);
	            newset=navbar.getAttribute('defaultset') + ',pdfDownload-button';
	            navbar.setAttribute('currentset', newset);
	            document.persist('nav-bar', 'currentset');
	        }
        
    }
    
	getBrowser().addEventListener("click", mouseClick, true);

	window.addEventListener("load", init, true);

	try {
		//legacy options
		retrieveLegacyOptions();
	} catch(ex) {}

	document.getElementById("menu_ToolsPopup").addEventListener("popupshowing", NitroPDF.PDFDownload.Shared.togglePDFDownloadToolsItem, false);
	document.getElementById("menu_FilePopup").addEventListener("popupshowing", NitroPDF.PDFDownload.Shared.togglePDFDownloadFileItem, false);
	getBrowser().addProgressListener(pdfDownloadUrlBarListener, Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
	
	//myPrefObserver.register();

	togglePDFDownloadEnableDisableIcon();
	
	addressChangedEventHandler.init();
	
	//add download observer
	initDownloadObserver();
    //register the uninstall observer
    UninstallObserver.register();
}

function uninit() {
	
	//myPrefObserver.unregister();
	unloadDownloadObserver();
	
    getBrowser().removeProgressListener(pdfDownloadUrlBarListener);
	getBrowser().removeEventListener("click", mouseClick, true);
    if (document.getElementById("contentAreaContextMenu") != null) {
        document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", checkPDFDownloadContextMenu, false);
    }
	if (document.getElementById("menu_ToolsPopup") != null) {
        document.getElementById("menu_ToolsPopup").removeEventListener("popupshowing", NitroPDF.PDFDownload.Shared.togglePDFDownloadToolsItem, false);
	}
    if (document.getElementById("menu_FilePopup") != null) {
        document.getElementById("menu_FilePopup").removeEventListener("popupshowing", NitroPDF.PDFDownload.Shared.togglePDFDownloadFileItem, false);
    }
    window.removeEventListener("load", init, false);
    //register the uninstall observer
    UninstallObserver.unregister();

	addressChangedEventHandler.uninit();
	
	pdfDownloadService.unregister();
	enablePDFPlugin();
}*/

/******************************************************************************
 *                       Preference observer	                              *
 *****************************************************************************/
/*
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
	  //pdfDownloadService.mlog("The properties disable_full_page_plugin_for_types has been restored and the PDF plugin disabled!");
	  var disabled = mimeType;
        if (sltPrefs.prefHasUserValue(kDisabledPluginTypesPref)) {
          disabled = sltPrefs.getCharPref(kDisabledPluginTypesPref);
          if (disabled.indexOf(mimeType) == -1) {
	      if (disabled == "") {
		   disabled = mimeType;
	      } else {
               disabled += "," + mimeType;
            }
            sltPrefs.setCharPref(kDisabledPluginTypesPref, disabled);   
	    }
        } else {
          sltPrefs.setCharPref(kDisabledPluginTypesPref, disabled);   
        }
        
	  setTimeout( function() {
	  			var catman = Components.classes["@mozilla.org/categorymanager;1"].getService(Components.interfaces.nsICategoryManager);
	  			catman.deleteCategoryEntry("Gecko-Content-Viewers", mimeType, false);
			  }, 100 );
        break;
    }
  }
}
*/
	
/******************************************************************************
 *                       Status bar button handlers                           *
 *****************************************************************************/
 
 /*function onStatusBarButtonClick() {
 
	//isAddonDisabled = !isAddonDisabled;
	openedSite.isAddonDisabled = !openedSite.isAddonDisabled;
	
	if (openedSite.isAddonDisabled) {
	
		sitesWithDisabledAddon.push(parseUrl(getCurrentLocation()));
	}
	else {
	
		removeSiteFromDisabledSitesList(parseUrl(getCurrentLocation()));
	}

	setStatusBarButtonIcon(openedSite.isAddonDisabled);
	//changeWidgetsVisibility();
 }*/
 
 
 /*function setStatusBarButtonIcon(isAddonDisabled) {
 
	var strings = document.getElementById("pdfdownloadStrings");
	var iconPath = isAddonDisabled ? strings.getString("addonDisabledIconPath") : strings.getString("addonEnabledIconPath");
	var statusBarButtonIcon = document.getElementById("statusBarButtonIcon");
	
	statusBarButtonIcon.src = iconPath;
 }
 
 
 function onAddSiteToBanListMenuItemClick() {
 
	var preferencesString = getExclusionList();
	var siteUrlBase = parseUrl(getCurrentLocation());
		
	if (preferencesString.search(siteUrlBase) == -1) {
	
		preferencesString = preferencesString.concat(";" + siteUrlBase);
		
		var preferencesService  = Components.classes["@mozilla.org/preferences-service;1"].
								getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");
							
		preferencesService.setCharPref("exclusionListPref", preferencesString);
		
		//setOpenedSite(siteUrlBase, true);
		//openedSite.isAddonDisabled = true;
	}
 }*/
 
 
 /*function onDeleteSiteFromBanList(sitesToRemove) {

	 for (i = 0; i < sitesToRemove.length; i++) {
	 
		 var site = sitesToRemove[i];
		 if (site.value == openedSite.url) {
		 
			 alert("OK");
			 openedSite.isAddonDisabled = false;
			 return;
		 }
	 }
 }*/
 
 /*function changeWidgetsVisibility() {

	document.getElementById("PDFDownloadToolsItem").disabled = openedSite.isAddonDisabled;//isAddonDisabled;
	document.getElementById("filemenu-pdfdownload-savepdf").disabled = openedSite.isAddonDisabled;//isAddonDisabled;
	document.getElementById("pdfDownload-button").disabled = openedSite.isAddonDisabled;//isAddonDisabled;
 }*/
 
 
 /*function isSiteAvailable(siteUrl) {
	
	var siteUrlBase = parseUrl(siteUrl);
	var preferencesString = getExclusionList();
		
	if (preferencesString.search(siteUrlBase) != -1) {
	
		// a site is in Exclusion list
		return false;
	}
	
	return true;
 }
 
 
 function getExclusionList() {
 
	var preferencesService  = Components.classes["@mozilla.org/preferences-service;1"].
								getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");
	var preferencesString = "";
	try {
		preferencesString = preferencesService.getCharPref("exclusionListPref");
	}
	catch(ex) { }
	
	return preferencesString;
 }
 
 
 function parseUrl(siteUrl) {

	 const protocolPrefix = "://";//"http://";
	 var parsingResult = "";
	 
	 var protocolPrefixIndex = siteUrl.search(protocolPrefix);
	 if (protocolPrefixIndex != -1) {
		
		protocolPrefixIndex += protocolPrefix.length;
		var nextSlashIndex = siteUrl.indexOf('/', protocolPrefixIndex);
		if (nextSlashIndex != -1) {
			
			parsingResult = siteUrl.substr(protocolPrefixIndex, nextSlashIndex - protocolPrefixIndex);
		}
		else {
		
			parsingResult = siteUrl.substr(protocolPrefixIndex, siteUrl.length - protocolPrefixIndex - 1);
		}
	 }
	 else {
	 
		parsingResult = siteUrl;
	 }
	 
	 const wwwDomain = "www";
	 var wwwDomainIndex = parsingResult.indexOf(wwwDomain);
	 if (wwwDomainIndex != -1) {
	 
		var startingIndex = wwwDomainIndex + wwwDomain.length + 1;
		parsingResult = parsingResult.substr(startingIndex, parsingResult.length - startingIndex);
	 }
	 
	 return parsingResult;
 }
 
 
 // if user navigates to a new site then enable an addon by default
 function navigateUrl(url) {

	 var urlBase = parseUrl(url);
	 
	 for (i = 0; i < sitesWithDisabledAddon.length; i++) {

		if (urlBase == sitesWithDisabledAddon[i]) {
			setOpenedSite(sitesWithDisabledAddon[i], true);
			return;
		}
	 }
	 
	 if (openedSite.url != urlBase) {
		setOpenedSite(urlBase, !isSiteAvailable(url));
	 }	 	 
 }
 

 function setOpenedSite(siteUrl, addonDisabled) {
 
	openedSite.url = siteUrl;
	openedSite.isAddonDisabled = addonDisabled;
	
	setStatusBarButtonIcon(openedSite.isAddonDisabled);
	//changeWidgetsVisibility();
 }
 
 
 function onTabHasBeenRemoved(event) {

	// a closing tab
	var browser = event.target.linkedBrowser;
	// a site that is opened in a closing tab
	var closingTabUrl = parseUrl(browser.currentURI.spec);
	
	removeSiteFromDisabledSitesList(closingTabUrl);
 }

 
 function removeSiteFromDisabledSitesList(siteUrl) {
 
	var tempArray = new Array();
	for (i = 0; i < sitesWithDisabledAddon.length; i++) {
	
		if (siteUrl != sitesWithDisabledAddon[i]) {
		
			tempArray[i] = sitesWithDisabledAddon[i];
		}
	}
	
	sitesWithDisabledAddon = tempArray;
 }
 
 
 function tabHasBeenSelected() {
 
	navigateUrl(getCurrentLocation());
 }*/
 
 
 /*function onMouseOver(event) {
 
	showStatusBarButtonState(event, getToolTipForStatusBarButton());
 }
 
 function onMouseOut(event) {
 
	hideStatusBarButtonState(getToolTipForStatusBarButton());
 }
 
 function getToolTipForStatusBarButton() {
 
	 if (openedSite.isAddonDisabled) {
	 
		 return "enableAddonTooltip";
	 }
	 
	 return "disableAddonTooltip";
 }
 
 function hideStatusBarButtonState(tooltipName) {
 
	var popup = document.getElementById(tooltipName);
	popup.hidePopup();
 }
 
 function showStatusBarButtonState(event, tooltipName) {
 
	var popup = document.getElementById(tooltipName);
	var statusBarButton = document.getElementById('pdfdownload-statusbarButton');
	
	//popup.showPopup(statusBarButton, -1, -1, "tooltip", "topleft", "topleft");
	popup.showPopup(statusBarButton, statusBarButton.boxObject.screenX, statusBarButton.boxObject.screenY - 3.5 * statusBarButton.boxObject.height, "tooltip", "topleft", "topleft");
 }*/
 
 /*function togglePDFDownloadEnableDisableIcon() {

	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		                               .getService(Components.interfaces.nsIPrefBranch);
								   
	/*if (!prefs.prefHasUserValue("extensions.pdfdownload.showEnableDisableIcon")) {
		prefs.setBoolPref("extensions.pdfdownload.showEnableDisableIcon",true);
	}*//*
		
	alert('Value = ' + prefs.getBoolPref("extensions.pdfdownload.showEnableDisableIcon"));
	if (true == prefs.getBoolPref("extensions.pdfdownload.showEnableDisableIcon")) {
		document.getElementById("pdfdownload-statusbarpanel").hidden = false;
	} else {
		document.getElementById("pdfdownload-statusbarpanel").hidden = true;
	}
	
	alert('Hidden = ' + document.getElementById("pdfdownload-statusbarpanel").hidden);
}*/
 
/**********************************************************************************************************************
 **********************************************************************************************************************/
 
 /*var pdfDownloadAddressChangedListener = {
  QueryInterface: function(aIID)
  {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  onLocationChange: function(aProgress, aRequest, aURI)
  {
    addressChangedEventHandler.processNewURL(aURI);
  }
};

var addressChangedEventHandler = {
  oldURL: null,
  
  init: function() {
    // Listen for webpage loads
    gBrowser.addProgressListener(pdfDownloadAddressChangedListener,
        Components.interfaces.nsIWebProgress.NOTIFY_LOCATION);
  },
  
  uninit: function() {
    gBrowser.removeProgressListener(pdfDownloadAddressChangedListener);
  },

  processNewURL: function(aURI) {
	  
    if (aURI.spec == this.oldURL)
      return;
    
	navigateUrl(aURI.spec);
    
    this.oldURL = aURI.spec;
  }
};


// listen a tab removing event
gBrowser.mTabContainer.addEventListener("TabClose", onTabHasBeenRemoved, false);
//do the init on load
window.addEventListener("load", init, false);
//do the unload
window.addEventListener("unload",uninit,false);*/


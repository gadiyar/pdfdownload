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
   - 
***** END LICENSE BLOCK *****/

var PdfDownloadShared = function() {}


PdfDownloadShared.prototype.openURL = function(aURL) {
	var navWindow;
	try {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
		navWindow = wm.getMostRecentWindow("navigator:browser");
	}	catch (ex) {
	}

	if (navWindow) {
		if ("delayedOpenTab" in navWindow)
			navWindow.delayedOpenTab(aURL);
		else if ("loadURI" in navWindow)
			navWindow.loadURI(aURL);
		else
			navWindow.content.location.href = aURL;
	}	else {
		var ass = Components.classes["@mozilla.org/appshell/appShellService;1"].getService(Components.interfaces.nsIAppShellService);
		w = ass.hiddenDOMWindow;
		w.openDialog("chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", aURL);
	}
}

PdfDownloadShared.prototype.writeLog = function(msg) {
    Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("PDF Download: " + msg);
}

PdfDownloadShared.prototype.resolveFileName = function(fileName) {
	var platform = /mac/i.test(navigator.platform) ? "mac" :
                   /win/i.test(navigator.platform) ? "win" :
                   /os\/2/i.test(navigator.platform) ? "os/2" : "unix";
    var path = null;
   	var oFile 	= Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
	try {
		oFile.initWithPath(fileName);
        path = pdfDownloadShared.getFilePath(oFile,platform);
        if (path != null) {
            return path;
        }
   	} catch (ex) {}
    /* check if the viewer specified exists using the path specified as a relative path
     * starting from the path where Firefox is installed
     */
    oFile = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("CurProcD", Components.interfaces.nsIFile);
    try {
		var tmpPath = oFile.path;
		oFile 	= Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
		oFile.initWithPath(((tmpPath.search(/\\/) != -1) ? tmpPath + "\\" : tmpPath + "/") + fileName);
        //oFile.append(fileName);
        path = pdfDownloadShared.getFilePath(oFile,platform);
        if (path != null) {
            return path;
        }
    } catch (ex) { pdfDownloadShared.writeLog(ex); }
    /* check if the viewer specified exists using the PATH system variable */
	var userEnvironment = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);
	var path_separator = "";
    if (platform == "win") {
    	path_separator = ";";
    } else if (platform == "mac") {
    	path_separator = ":";
    } else if (platform == "os/2") {
    	path_separator = ";";
    } else {
    	path_separator = ":";
    }
	
    if (userEnvironment.exists("PATH")) {
    	var systemPath = userEnvironment.get("PATH").split(path_separator);
		oFile 	= Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
    	for(var i = 0; i < systemPath.length; i++) {
    		try {
				oFile.initWithPath(((systemPath[i].search(/\\/) != -1) ? systemPath[i] + "\\" : systemPath[i] + "/") + fileName);
				//oFile.append(fileName);
                path = pdfDownloadShared.getFilePath(oFile,platform);
                if (path != null) {
                    return path;
                }
   			} catch (ex) { pdfDownloadShared.writeLog(ex); }
    	}
    }
    return null;
}

PdfDownloadShared.prototype.getFilePath = function (oFile,platform) {
    if (platform != "mac") {
    	if (oFile.exists() && oFile.isFile() && oFile.isExecutable()) {
    		return oFile.path;
    	}
    } else {
        var path = pdfDownloadShared.getFileNameToExecuteForMac(oFile);
        if (path != null) {
           return path;
        }
    }
    return null;
}

PdfDownloadShared.prototype.removeSubString = function(str, subStr) {
	var newString = str.split(subStr).join('').split(',,').join(',');
	if (newString.indexOf(',') == 0) newString = newString.substring(1); // remove leading comma
	if (newString.lastIndexOf(',') == newString.length-1) newString = newString.substring(0,newString.length-1); // remove trailing comma
	return newString;
}

/* BEGIN of the code provided by Davide Ficano (aka Dafizilla) */
PdfDownloadShared.prototype.getFileNameToExecuteForMac = function(oFile) {
        // See bug 307463 and 322865
        var leafName = oFile.leafName;
        var bundleFile = oFile;

        if (leafName.match(/\.app$/) && oFile.exists() && oFile.isDirectory()) {
            try {
                var pListFile = pdfDownloadShared.makeLocalFile(oFile.path, ["Contents", "Info.plist"]);
                var m;
                if (pListFile.exists() && pListFile.isFile()) {
                    var pListText = pdfDownloadShared.loadTextFile(pListFile);
                    var re = /\<key\>CFBundleExecutable\<\/key\>[ \t\n\v\r]*\<string\>[ \t\n\v\r]*(.*)[ \t\n\v\r]*\<\/string\>/
                    m = pListText.match(re);
                }
                if (m && m.length == 2) {
                    bundleFile = pdfDownloadShared.makeLocalFile(oFile.path,["Contents", "MacOS", m[1]]);
                } else {
                    // workaround for binary version of Info.plist file (by Denis Remondini)
                    // we assume that the executable file has the same name of the bundle .app directory
                    var fileName = leafName.substring(0,leafName.length-4);
                    bundleFile = pdfDownloadShared.makeLocalFile(oFile.path,["Contents", "MacOS", fileName]);
                    if (!bundleFile.exists() || !bundleFile.isFile()) {
                        fileName = "AdobeReader";
                        bundleFile = pdfDownloadShared.makeLocalFile(oFile.path,["Contents", "MacOS", fileName]);
                        if (!bundleFile.exists() || !bundleFile.isFile()) {
                            fileName = "Adobe Reader";
                            bundleFile = pdfDownloadShared.makeLocalFile(oFile.path,["Contents", "MacOS", fileName]);
                        }                        
                    }
                }
            } catch (err) { 
                //writeLog("error: "+err);
            }
        }

        if (bundleFile.exists() && bundleFile.isFile()) {
            return bundleFile.path;
        }
        return null;
}

PdfDownloadShared.prototype.makeLocalFile = function(path, arrayAppendPaths) {
        var file;
    
        try {
            file = path.QueryInterface(Components.interfaces.nsILocalFile);
        } catch (err) {
            file = Components.classes["@mozilla.org/file/local;1"]
                   .createInstance(Components.interfaces.nsILocalFile);
            file.initWithPath(path);
        }
    
        if (arrayAppendPaths != null
            && arrayAppendPaths != undefined
            && arrayAppendPaths.length) {
            for (var i = 0; i < arrayAppendPaths.length; i++) {
                file.append(arrayAppendPaths[i]);
            }
        }
        return file;
    }
    
PdfDownloadShared.prototype.read = function(file) {
    const CONTRACTID_FIS = "@mozilla.org/network/file-input-stream;1";
    const nsFis = Components.interfaces.nsIFileInputStream;
    const CONTRACTID_SIS = "@mozilla.org/scriptableinputstream;1";
    const nsSis = Components.interfaces.nsIScriptableInputStream;


    var str = "";
    var fiStream = Components.classes[CONTRACTID_FIS].createInstance(nsFis);
    var siStream = Components.classes[CONTRACTID_SIS].createInstance(nsSis);

    fiStream.init(file, 1, 0, false);
    siStream.init(fiStream);
    str += siStream.read(-1);
    siStream.close();
    fiStream.close();
    return str;
}
    
PdfDownloadShared.prototype.loadTextFile = function(fileName) {
    var file = pdfDownloadShared.makeLocalFile(fileName);

    var fileContent = pdfDownloadShared.read(file);

    return pdfDownloadShared.toUnicode(fileContent, "UTF-8", fileContent);
}
    
PdfDownloadShared.prototype.getUnicodeConverterService = function (charset) {
    const CONTRACTID_UNICODE = "@mozilla.org/intl/scriptableunicodeconverter";
    const nsUnicodeService = Components.interfaces.nsIScriptableUnicodeConverter;

    var unicodeCvt = Components.classes[CONTRACTID_UNICODE].getService(nsUnicodeService);
    if (charset) {
        unicodeCvt.charset = charset;
    }

    return unicodeCvt;
}
    
PdfDownloadShared.prototype.toUnicode = function(text, charset, defValue) {
    try {
        return pdfDownloadShared.getUnicodeConverterService(charset)
                .ConvertToUnicode(text);
    } catch (err) {
        if (defValue) {
            return defValue;
        }
    }
    return null;
}
/* END of the code provided by Davide Ficano (aka Dafizilla) */


PdfDownloadShared.prototype.getTodayDate = function() {
    var date = new Date();
    var day = date.getDate();
    var month = date.getMonth();
    var year = date.getFullYear();    
    if (day <= 9) {
        day = "0" + day;
    }
    if (month <= 9) {
        month = "0" + month;
    }
    return year + "" + month + "" + day;
}

PdfDownloadShared.prototype.getPDFDownloadTempDir = function() {
    var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
	var dir = fileLocator.get("TmpD", Components.interfaces.nsILocalFile);
	var tempDir = dir.clone();
    tempDir.append("pdfdownload");
    return tempDir;
}

PdfDownloadShared.prototype.help = function(s) {
	var url = "http://www.pdfdownload.org";
	if (s) {
		url += "#" + s;
	}
	pdfDownloadShared.openURL(url);
}

// create the object
const pdfDownloadShared = new PdfDownloadShared();


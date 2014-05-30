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

var _openPDFLinkRadioGroup = "pdfdownload-openPDFLink";
var _openPDFtoHTMLRadioGroup = "pdfdownload-openPDFtoHTML";
var _openPDFRadioGroup	  = "pdfdownload-openPDF";
var _pdfViewerPathTextBox = "pdfdownload-pdfViewerPath";
var _openPDFNewWindow = "openPDFNewWindow";
var _openPDFNewTab = "openPDFNewTab";
var _openPDFSameTab = "openPDFSameTab";


const preferencesService  = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("pdfdownload.");

const fileCID  = "@mozilla.org/file/local;1";
const fileIID  = Components.interfaces.nsILocalFile;

function onOK(notExecutableFileMsg) {
    /*
	Save how to open the PDF link: in the same tab, in a new tab or in a new window.
     */
    var openPDFLink = document.getElementById(_openPDFLinkRadioGroup);
    var prefname = "openPDFLink";
    preferencesService.setCharPref(prefname,openPDFLink.selectedItem.id);

    /*
	Save how to open the PDFtoHTML link: in the same tab, in a new tab or in a new window.
     */
    var openPDFtoHTML = document.getElementById(_openPDFtoHTMLRadioGroup);
    var prefname = "openPDFtoHTML";
    preferencesService.setCharPref(prefname,openPDFtoHTML.selectedItem.id);

    var path = document.getElementById(_pdfViewerPathTextBox).value;
    var openPDF = document.getElementById(_openPDFRadioGroup);
    if ((openPDF.selectedItem.id == "customViewer") && (path == "")) {
      alert(notExecutableFileMsg);
	return false;
    }

    /*
	Save how to open a PDF file: with plugin, with default viewer, with custom viewer
     */
    prefname = "openPDF";
    preferencesService.setCharPref(prefname,openPDF.selectedItem.id);
 
    /*
     Save the path of the custom viewer
     */
    prefname = "pdfViewerPath";
    if (openPDF.selectedItem.id == "customViewer") {
	preferencesService.setCharPref(prefname,path);
    }

    return true;
}

function onLoad() {
    sizeToContent();
    var openLink = document.getElementById(_openPDFLinkRadioGroup);
    /*
	Read how to open the link: in the same tab, in a new tab or in a new window.
     */
    var prefname = "openPDFLink";
    var prefvalue;
    try {
      prefvalue = preferencesService.getCharPref(prefname);
    } catch(ex) {
	prefvalue = "openPDFNewTab";
    }
    openLink.selectedItem = document.getElementById(prefvalue);

    var openPDFtoHTML = document.getElementById(_openPDFtoHTMLRadioGroup);
    /*
	Read how to open the link: in the same tab, in a new tab or in a new window.
     */
    var prefname = "openPDFtoHTML";
    var prefvalue;
    try {
      prefvalue = preferencesService.getCharPref(prefname);
    } catch(ex) {
	prefvalue = "openHTMLNewTab";
    }
    openPDFtoHTML.selectedItem = document.getElementById(prefvalue);


    /*
	Read how to open a PDF file: with plugin, with default viewer, with custom viewer
     */
    var openPDF = document.getElementById(_openPDFRadioGroup);
    prefname = "openPDF";
    try {
      prefvalue = preferencesService.getCharPref(prefname);
    } catch(ex) {
	prefvalue = "defaultViewer";
    }
    openPDF.selectedItem = document.getElementById(prefvalue);

    if (prefvalue == "customViewer") {
	document.getElementById(_pdfViewerPathTextBox).disabled = false;
    } else {
	document.getElementById(_pdfViewerPathTextBox).disabled = true;
    }
    if (prefvalue != "usePlugin") {	
	document.getElementById(_openPDFSameTab).setAttribute("disabled",true);
	document.getElementById(_openPDFNewTab).setAttribute("disabled",true);
	document.getElementById(_openPDFNewWindow).setAttribute("disabled",true);		
    } else {
	document.getElementById(_openPDFSameTab).removeAttribute("disabled");
	document.getElementById(_openPDFNewTab).removeAttribute("disabled");
	document.getElementById(_openPDFNewWindow).removeAttribute("disabled");
    }

   
    /*
	Read the path of the custom viewer
     */
    prefname = "pdfViewerPath";
    try {
      prefvalue = preferencesService.getCharPref(prefname);
    } catch(ex) {
	prefvalue = "";
    } 

    document.getElementById(_pdfViewerPathTextBox).value = prefvalue;
    document.getElementById(_openPDFRadioGroup).addEventListener("select",toggleViewerPath,true);

}

function toggleViewerPath(event) {
	var openPDF = document.getElementById(_openPDFRadioGroup);
	if (openPDF.selectedIndex != 2) {
		document.getElementById(_pdfViewerPathTextBox).setAttribute("disabled",true);
	} else {
		document.getElementById(_pdfViewerPathTextBox).removeAttribute("disabled");
	}
	if (openPDF.selectedIndex != 0) {	
		document.getElementById(_openPDFSameTab).setAttribute("disabled",true);
		document.getElementById(_openPDFNewTab).setAttribute("disabled",true);
		document.getElementById(_openPDFNewWindow).setAttribute("disabled",true);		
	} else {
		document.getElementById(_openPDFSameTab).removeAttribute("disabled");
		document.getElementById(_openPDFNewTab).removeAttribute("disabled");
		document.getElementById(_openPDFNewWindow).removeAttribute("disabled");
	}
}

function onPickPdfViewerPath(dialogTitle,exeFiles,allFiles,notExecutableFileMsg) {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, dialogTitle, nsIFilePicker.modeOpen);
	fp.appendFilter(exeFiles,"*.exe");
	fp.appendFilter(allFiles,"*");
	var file  = Components.classes[fileCID].createInstance(fileIID);
	var pdfViewer;
	var path;
	var prefname = "pdfViewerPath";
    	try {
      	pdfViewer = preferencesService.getCharPref(prefname);
    	} catch(ex) {
		pdfViewer = "";
    	}
	if (pdfViewer != "") {
		var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
		var sTmp	= (fileLocator.get("TmpD", Components.interfaces.nsILocalFile)).path;
		var slash 	= (sTmp.indexOf("\\") > -1) ? "\\" : "/";
		var slashPos = pdfViewer.lastIndexOf(slash);
	      path = pdfViewer.substring(0, slashPos);       
		file.initWithPath(path);
		fp.defaultString = pdfViewer.substring(slashPos+1);
		fp.displayDirectory = file;
	}	

	var res = fp.show();
	if (res == Components.interfaces.nsIFilePicker.returnOK) {
		file.initWithPath(fp.file.path);
		if (file.isFile() && file.isExecutable()) {
			preferencesService.setCharPref(prefname,fp.file.path);
			document.getElementById(_pdfViewerPathTextBox).value = fp.file.path;
			document.getElementById(_pdfViewerPathTextBox).disabled = false;
			var openPDF = document.getElementById(_openPDFRadioGroup);
			openPDF.selectedItem = document.getElementById("customViewer");
		} else {
			alert(notExecutableFileMsg);
		}
	}
}

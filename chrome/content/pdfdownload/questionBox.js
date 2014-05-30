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
	
var strbundle;	
var sltPrefs = Components.classes['@mozilla.org/preferences-service;1']
          .getService(Components.interfaces.nsIPrefBranch);


// Cancel button handler
function doCancel() {
	window.arguments[0].res = "cancel";
	window.close();
}

// Download button handler
function doDownload() {
	window.arguments[0].res = "download";
	window.close();
}

// Open button handler
function doOpen() {
	window.arguments[0].res = "open";
	window.close();
}

// Open button handler
function doOpenHtml() {
	window.arguments[0].res = "openHtml";
	window.arguments[0].filesize = document.getElementById("fileSize").value;
	window.close();
}

// Open normally button handler
function doOpenWithoutExtension() {
	window.arguments[0].res = "openWithoutExtension";
	window.close();
}

function disableBtns(url,ext) {
	/*
	 * If it is a pdf.gz file, we disable the open button because usually a 
	 * pdf viewer is not able to open this kind of file.
	 */
	if (ext == "pdf.gz") {
		document.getElementById("open-button").disabled = true;
	}
	if (isLinkType("file:",url) || (url.indexOf("//localhost") != -1) || (url.indexOf("//127.0.0.1") != -1)) {
		document.getElementById("openHTML-button").disabled = true;
	}
}
	
// Checks the type of a link
function isLinkType(linktype, link) {
	try {
		var protocol = link.substr(0, linktype.length);
		return protocol.toLowerCase() == linktype;
	} catch(e) {
		return false;
	}
}

function getFileSize(url) {
	var xmlhttp
	var done = 0;
	strbundle = document.getElementById("strings");
	var part1 = strbundle.getString("questionPart1");				
	var descr = document.getElementById("QuestionLabel");
	var fileSize = document.getElementById("fileSize");
	try {
		xmlhttp = new XMLHttpRequest();
	} catch (e) {
		xmlhttp = false;
	}
	if (xmlhttp) {
		xmlhttp.open("HEAD", url, true);
		xmlhttp.onreadystatechange=function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					var size = xmlhttp.getResponseHeader("Content-Length");		
					fileSize.value = size;								
					if (size >= 1024*1024) {
						size = size / (1024*1024);
						part1 = part1 + " (" + size.toFixed(1) + " MB)" ;
					} else if (size >= 1024) {
						size = size / 1024;
						part1 = part1 + " (" + parseInt(size + .5) + " KB)";
					} else if (size != null) {
						part1 = part1 + " (" + size + " bytes)";
					}
					descr.value = part1 + strbundle.getString("questionPart2");
					done = 1;
				} else if (done == 0) {
					descr.value = part1 + strbundle.getString("questionPart2");
				} 
			} else if (done == 0) {
				descr.value = part1 + strbundle.getString("questionPart2");
			}	 
		}
		xmlhttp.send(null);
	}
}

function isTooltipEnabled() {
	if (!sltPrefs.prefHasUserValue("extensions.pdfdownload.showTooltips")) {
		sltPrefs.setBoolPref("extensions.pdfdownload.showTooltips",true);
	}
	return sltPrefs.getBoolPref("extensions.pdfdownload.showTooltips");
}

function onTooltipPopupShowing(popup) {
	if (!firefox3) {
		var diff = popup.boxObject.height - popup.firstChild.boxObject.height;
		popup.sizeTo(popup.boxObject.width, popup.firstChild.boxObject.height + diff);
	}
	return true;
}

function onMouseOver(e,toolTipName,obj) {
	if (isTooltipEnabled()) {
		var xulWindow = document.getElementById("PDFDownload-question-window");
		var popup = document.getElementById(toolTipName);
		if (!firefox3) {
			var diff = popup.boxObject.height - popup.firstChild.boxObject.height;
	
			popup.sizeTo(popup.boxObject.width, popup.firstChild.boxObject.height + diff);
			popup.showPopup(obj, e.clientX+xulWindow.boxObject.screenX-(popup.boxObject.width/2), xulWindow.boxObject.screenY+window.innerHeight-10, "tooltip", "bottomleft", "topleft");
		} else {
			//popup.openPopup(obj, "after_start", 0,0, false, false);
			popup.openPopupAtScreen(e.clientX+xulWindow.boxObject.screenX, xulWindow.boxObject.screenY+e.clientY+5,false);
		}
	}
}

function onMouseOut(toolTipName) {
	var popup = document.getElementById(toolTipName);
	popup.hidePopup();
}

var firefox3 = true;
try {
  var version = Application.version;  // use of FUEL that has been introducted only in FF3
} catch(e) {
  firefox3 = false;	
}
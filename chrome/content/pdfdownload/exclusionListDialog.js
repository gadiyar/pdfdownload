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
 
 const preferencesService  = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");
 const delimiter = ';';
 
 NitroPDF.PDFDownload.Exclusion = {
	
	onLoad : function() {
		
		var preferencesString = "";
		try {
		       
		       preferencesString = preferencesService.getCharPref("exclusionListPref");
		}
		catch (ex) { }
		
		var items = preferencesString.split(delimiter);
		var excludedSitesListBox = document.getElementById("pdfdownload-exclusionList");
		for (i = 0; i < items.length; i++) {
	       
			if (items[i] != "") {
			
			       excludedSitesListBox.appendItem(items[i], items[i]);
			}
		}
	},
	       
	closeDialog : function() {
		
		var excludedSitesListBox = document.getElementById("pdfdownload-exclusionList");
		var rowsCount = excludedSitesListBox.getRowCount();
		
		var preferencesString = "";
		for (i = 0; i < rowsCount; i++) {
		       
			preferencesString = preferencesString.concat(excludedSitesListBox.getItemAtIndex(i).value);
			
			if (i != rowsCount - 1) {
			
			       preferencesString = preferencesString.concat(delimiter);
			}
		}
		
		preferencesService.setCharPref("exclusionListPref", preferencesString);
		
		window.close();
	},
	
	
	addWebSiteToBanList : function() {
		
		siteUrl = document.getElementById("pdfdownload-bannedWebSite").value;
		
		if (siteUrl != "") {
			
			if (doesSiteExistInBanlist(siteUrl)) {
			
				NitroPDF.PDFDownload.Shared.showMessage("This site is already in Exclusion List.");
				return;
			} 
			
		       document.getElementById("pdfdownload-exclusionList").appendItem(siteUrl, siteUrl);
		       document.getElementById("pdfdownload-bannedWebSite").value = "";
		}
		else {
			
			NitroPDF.PDFDownload.Shared.showMessage("You must enter a URL in order to add.");
		}
	},
	
	
	deleteWebSiteFromBanList : function() {
		
		var excludedSitesListBox = document.getElementById("pdfdownload-exclusionList");
		var sitesToDelete = excludedSitesListBox.selectedItems;
		
		if (sitesToDelete.length == 0) {
		       
		       NitroPDF.PDFDownload.Shared.showMessage("You must select one or more URLs to delete."); 
		}
		else {
			
			// used to store elements for deleting 
			var tempArray = new Array(sitesToDelete.length);
			
			for (i = 0; i < tempArray.length; i++) {
			
				tempArray[i] = sitesToDelete[i];
			}
       
			// remove items from Exclusion List Box
			for (i = 0; i < tempArray.length; i++) {
									       
			       index = excludedSitesListBox.getIndexOfItem(tempArray[i]);
			       excludedSitesListBox.removeItemAt(index); 
			}
		}
	},
	
	
	/*function showMessage(errorMessage) {
	       
	       var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
	       prompts.alert(this, "PDF Download", errorMessage); 
	}*/
	
	
	doesSiteExistInBanlist : function(siteUrl) {
	       
		var excludedSitesListBox = document.getElementById("pdfdownload-exclusionList");
		var listBoxRowsCount = excludedSitesListBox.getRowCount();
			
		for (i = 0; i < listBoxRowsCount; i++) {
		
			if (siteUrl == excludedSitesListBox.getItemAtIndex(i).value) {
			
				return true;
			}
		}
		
		return false;
	}
 };
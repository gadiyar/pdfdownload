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
   - 
***** END LICENSE BLOCK *****/

const preferencesService  = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pdfdownload.");

const fileCID  = "@mozilla.org/file/local;1";
const fileIID  = Components.interfaces.nsILocalFile;

NitroPDF.PDFDownload.Options = {
            
            _openPDFRadioGroup : "pdfdownload-openPDF",
            _pdfViewerPathTextBox : "pdfdownload-pdfViewerPath",

            _previousValueOpenPDFPref : "",
            _previousValueWebToPDFDefaultAction : "",
            
            onOK : function(notExecutableFileMsg) {
            
                var path = document.getElementById(this._pdfViewerPathTextBox).value;
                var openPDF = document.getElementById(this._openPDFRadioGroup);
                if (openPDF.selectedItem.id == "customViewer") {
                            if (NitroPDF.PDFDownload.Shared.resolveFileName(path) == null) {
                                            alert(notExecutableFileMsg);
                            if (openPDF.selectedItem.id != preferencesService.getCharPref("openPDF")) {
                                openPDF.selectedItem = document.getElementById(preferencesService.getCharPref("openPDF"));
                            }
                                            return false;
                            }
                }
                if (!this.checkMargin("marginTop") ||
                    !this.checkMargin("marginBottom") ||
                    !this.checkMargin("marginLeft") ||
                    !this.checkMargin("marginRight") ||
                    (document.getElementById("webToPdfAction").selectedItem.id == "sendEmailRadio" && 
                      !this.checkEmail("emailAddress")) ) {
                        var strings = NitroPDF.PDFDownload.Shared.getBundle();
                        alert(strings.GetStringFromName("invalidEmailAddress"));
                        return false;
                }
                if (openPDF.selectedItem.id == "usePlugin") {
                    const kDisabledPluginTypesPref = "plugin.disable_full_page_plugin_for_types";
                        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                                   .getService(Components.interfaces.nsIPrefBranch);
            
                        var prefValue = "";
                        try {
                                prefValue = prefs.getCharPref(kDisabledPluginTypesPref);
                        } catch(ex) {}
                        prefValue = NitroPDF.PDFDownload.Shared.removeSubString(prefValue, "application/pdf");
                        prefs.setCharPref(kDisabledPluginTypesPref, prefValue);   
                }
                
                return true;
            },
            
            onCancel : function(notExecutableFileMsg) {
            
                var path = document.getElementById(this._pdfViewerPathTextBox).value;
                var openPDF = document.getElementById(this._openPDFRadioGroup);
            
                        try { 
                            if (preferencesService.getCharPref("openPDF") == "customViewer") {
                                        if (NitroPDF.PDFDownload.Shared.resolveFileName(path) == null) {
                                                        //alert(notExecutableFileMsg);
                                       // if (openPDF.selectedItem.id != preferencesService.getCharPref("openPDF")) {
                                       //     openPDF.selectedItem = document.getElementById(preferencesService.getCharPref("openPDF"));
                                       // }
                                        preferencesService.setCharPref("openPDF", this._previousValueOpenPDFPref);
                                                        //return false;
                                        }
                            }
                        }
                        catch(ex) {
                                // no nothing
                        }
            
            
                        try { 
                            if (preferencesService.getCharPref("webToPDF.action") == "sendEmail" && 
                                  !this.checkEmail("emailAddress")) {
                                      preferencesService.setCharPref("webToPDF.action", this._previousValueWebToPDFDefaultAction);
                                      //return false;
                            }
                        }
                        catch(ex) {
                                // no nothing
                        }
            
                return true;
            },
            
            onUpdatesPaneLoad : function() {
                        //dump("onUpdatesPaneLoad: start\n");
                        document.getElementById("version").setAttribute("value", NitroPDF.PDFDownload.Shared.getVersion());
                        //dump("onUpdatesPaneLoad: end\n");
            },
            
            onLoad : function() {
                    
                //dump("onLoad: start\n");     
                    
                //this.sizeToContentTrick();
                this._previousValueOpenPDFPref = preferencesService.getCharPref("openPDF");
                this._previousValueWebToPDFDefaultAction = preferencesService.getCharPref("webToPDF.action");
                if (!preferencesService.prefHasUserValue("showToolsMenuItem")) {
                            preferencesService.setBoolPref("showToolsMenuItem",true);
                            document.getElementById("showItemTools").checked = true;
                }
                /* 
                if (!preferencesService.prefHasUserValue("showTooltips")) {
                            preferencesService.setBoolPref("showTooltips",true);
                            document.getElementById("showTooltips").checked = true;
                }
                */
                //dump("onLoad: end\n");
            },
            
            sizeToContentTrick : function() {
                    /*
                     * Workaround to sizeToContent bug (Bug 91137)
                     */
                    var xulWindow = document.getElementById("PDFDownload_Options");
                    var wdth = window.innerWidth; // THIS IS NEEDED,
                    window.sizeToContent();
                    xulWindow.setAttribute("width",window.innerWidth + 30);
                
                    var hght = window.innerHeight; // THIS IS NEEDED,
                    window.sizeToContent();
                    xulWindow.setAttribute("height",window.innerHeight + 30);     
            },
            
            onPickPdfViewerPath : function(dialogTitle,exeFiles,allFiles,notExecutableFileMsg) {
                    var nsIFilePicker = Components.interfaces.nsIFilePicker;
                    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
                    fp.init(window, dialogTitle, nsIFilePicker.modeOpen);
                    fp.appendFilters(nsIFilePicker.filterApps);
                    fp.appendFilters(nsIFilePicker.filterAll);
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
                            try {
                                    file.initWithPath(path);
                                    fp.displayDirectory = file;
                            } catch (ex) {}
                            fp.defaultString = pdfViewer.substring(slashPos+1);
                    }	
            
                    var res = fp.show();
                    if (res == Components.interfaces.nsIFilePicker.returnOK) {
                            try {
                                    file.initWithPath(fp.file.path);
                        path = NitroPDF.PDFDownload.Shared.resolveFileName(fp.file.path);
                                    if (path != null) {
                                            preferencesService.setCharPref(prefname,path);
                                            document.getElementById(this._pdfViewerPathTextBox).value = path;
                                            document.getElementById(this._pdfViewerPathTextBox).disabled = false;
                                            var openPDF = document.getElementById(this._openPDFRadioGroup);
                                            openPDF.selectedItem = document.getElementById("customViewer");
                                    } else {
                                            alert(notExecutableFileMsg);
                                    }
                            } catch (ex) {
                        //NitroPDF.PDFDownload.Shared.writeLog("Exception: "+ex);
                                    alert(notExecutableFileMsg);
                            }
                    }
            },
            
            enableCustomViewer : function() {
                 document.getElementById("pdfdownload-openPDF").selectedItem = document.getElementById("customViewer");
            },
            
            enableSendEmail : function() {
                 document.getElementById("webToPdfAction").selectedItem = document.getElementById("sendEmailRadio");
            },
             
            checkEmail : function(fieldName) {
                 var field = document.getElementById(fieldName);
                 if (!NitroPDF.PDFDownload.Shared.validateEmail(field.value)) {
                     field.focus();
                     return false;
                 }
                 return true;
            },
             
            checkMargin : function(fieldName) {
                 var field = document.getElementById(fieldName);
                 if (isNaN(field.value) || field.value < 0 || field.value > 3) {
                     alert("You entered an invalid value. Please enter a margin value between 0-3 inches.");
                     field.focus();
                     return false;
                 }
                 return true;
            },
             
             
            getMostRecentBrowserWindow : function() {
                    var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService();
                    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
                    
                    return windowManagerInterface.getMostRecentWindow( "navigator:browser" );
            },
            
            getMostRecentBrowser : function(){
                    return this.getMostRecentBrowserWindow().getBrowser();
            },
            
             
            showExclusionListDialog : function() {
                     
                    window.openDialog("chrome://pdfdownload/content/exclusionListDialog.xul", "Exclusion List - Web sites", "chrome,modal,dialog,centerscreen", "", "");
            },
             
             
            subscribe : function() {
             
                    if (!this.checkEmail("subscribeEmailValue")) {
                    
                            NitroPDF.PDFDownload.Shared.showMessage("You must enter a valid email address.");
                            return;
                    }
                    
                    if (window.XMLHttpRequest) {
                            
                            var subscribeUrl = "http://www.nitropdf.com/free/newsletters/free_subscribe.aspx";
                            var emailTextBox = document.getElementById("subscribeEmailValue");
            
                            var request = new XMLHttpRequest();
                            request.open("POST", subscribeUrl, false);
                            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                            
                            var dataToSend = "email=" + emailTextBox.value + "&src=pdfdownload";
            
                            request.send(dataToSend);
            
                            if (200 == request.status) {
            
                                    NitroPDF.PDFDownload.Shared.showMessage("Thank you for subscribing. You will receive an email shortly asking you to confirm your subscription.");
                            }
                    }
            }           
};

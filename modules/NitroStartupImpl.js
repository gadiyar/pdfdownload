/*
  Copyright (C) 2010 Nitro PDF, Inc. & Nitro PDF Pty Ltd. 
   - All Rights Reserved.
   - See the file LICENSE.txt for licensing information.
*/

var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://pdfdownload/NitroStartup.js");

NitroPDFDownload.AddonManagerWrapper = {

  /* Preference object for the message count*/
  _version : null,
  _initialized : null,
  _overlay : null,
  
  /**
   * Object constructor.
   */
  _init : function() {
    //dump("NitroPDFDownload.AddonManagerWrapper._init call\n"); 
        this._version = "0.0";
        this._initialized = false;
        this.Query("{37E4D8EA-8BDA-4831-8EA1-89053939A250}");
    //dump("NitroPDFDownload.AddonManagerWrapper._init end\n"); 
  },

  /**
   * Returns the current extension version.
   * @return the current extension version.
   */
  get version() {
    //dump("NitroPDFDownload.AddonManagerWrapper.version call.\n");
    return this._version;
},

  /**
   * Query version from AddonManager.
   */
  Query : function(addonID) {
      //dump("NitroPDFDownload.AddonManagerWrapper.Query call\n"); 
    if (!this._initialized) {
            //dump("NitroPDFDownload.AddonManagerWrapper.Query: TRUE == !_initialized \n");
      /*
	this._queryEx(addonID, function(ver) {
                  //dump("NitroPDFDownload.AddonManagerWrapper.function1 call\n"); 
                  this._version = ver;
                  this._initialized = true;
                  //dump("NitroPDFDownload.AddonManagerWrapper.function1 end\n");
                  });
      */
      
      	this._queryEx(addonID); 
           
    }
    //dump("NitroPDFDownload.AddonManagerWrapper.Query end\n"); 
  },
  
  SetOverlay : function(overlay){
     //dump("NitroPDFDownload.AddonManagerWrapper.SetOverlay call\n"); 
    _overlay = overlay;
    //dump("NitroPDFDownload.AddonManagerWrapper.SetOverlay end\n"); 
  },
  

  SetVersion : function(ver) {
            //dump("NitroPDFDownload.AddonManagerWrapper.SetVersion call\n"); 
      this._version = ver;
      this._initialized = true;
      
      try{
        if (null != _overlay) {
            _overlay.isFirstPDFDownloadInstallation();
        }
      } catch(e){}
      
            //dump("NitroPDFDownload.AddonManagerWrapper.SetVersion end\n"); 
  },
  
  /*
   _receiveExtensionInfo : function (addon) {      
      //dump("NitroPDFDownload.AddonManagerWrapper._receiveExtensionInfo call\n");
      //dump(this);
      this._setVersion(addon.version);
      //dump("NitroPDFDownload.AddonManagerWrapper._receiveExtensionInfo end\n"); 
  },
  */
  
  _queryEx : function(addonID) {
    //dump("NitroPDFDownload.AddonManagerWrapper._queryEx call\n"); 
    var ascope = {};
    
    if (typeof(Components.classes["@mozilla.org/extensions/manager;1"]) != 'undefined') {
        //dump("Firefox 3 or older.\n");
       var extMan = Components.classes["@mozilla.org/extensions/manager;1"].
                              getService(Components.interfaces.nsIExtensionManager);
       var ext = extMan.getItemForID(addonID);
       ext.QueryInterface(Components.interfaces.nsIUpdateItem);
       
       this.SetVersion(ext.version);
       
        //dump("NitroPDFDownload.AddonManagerWrapper._queryEx end\n"); 
       return;
    }
     
    if (typeof(Components.utils) != 'undefined' && typeof(Components.utils.import) != 'undefined') {
        //dump("Firefox 4 or newer.\n");
        
       Components.utils.import("resource://gre/modules/AddonManager.jsm", ascope);              
       
       var gCurObj = this;       
       ascope.AddonManager.getAddonByID(addonID, function (addon) {      
                        //dump("function call\n");
                        gCurObj.SetVersion(addon.version);
                        //dump("function end\n"); 
            } );              
    }
     //dump("NitroPDFDownload.AddonManagerWrapper._queryEx end\n"); 
  }	 
    
};

// Constructor.
(function() {
      //dump("NitroPDFDownload.AddonManagerWrapper Constructor call\n"); 
      this._init();
      //dump("NitroPDFDownload.AddonManagerWrapper Constructor end\n"); 
}).apply(NitroPDFDownload.AddonManagerWrapper);

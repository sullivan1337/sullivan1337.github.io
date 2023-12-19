// Simple File List Script: ee-footer.js | Author: Mitchell Bennis | support@simplefilelist.com

// Used in front-side and back-side file list display

console.log('ee-footer.js Loaded');

// Upon page load completion...
jQuery(document).ready(function() {	

	console.log('eeSFL Document Ready');
	
	window.addEventListener('touchstart', function() {
		eeSFL_isTouchscreen = true;
	});
	
	
	// The File Operations Bar -----------------
	
	jQuery('#eeSFL_FileOpsAction').val('Folder'); // Make sure this gets reset if the page is reloaded.
	
	// Get translated text items
	var eeSFL_NewFolderNamePlaceholder = jQuery('#eeSFL_NewFolderNamePlaceholder').text();
	jQuery('#eeSFL_FileOpsActionInput').attr('placeholder', eeSFL_NewFolderNamePlaceholder); // Place this right away
	var eeSFL_ZipFileName = jQuery('#eeSFL_ZipFileName').text();
	var eeSFL_DeleteText = jQuery('#eeSFL_DeleteText').text();
	var eeSFL_DescriptionPlaceholder = jQuery('#eeSFL_DescriptionPlaceholder').html();
	
	// Required Inputs per Action
	jQuery('#eeSFL_FileOpsAction').on('change', function() {
		
		if(jQuery(this).val() == 'Delete') {
			
			console.log('Deleting Files');
			
			jQuery('#eeSFL_FileOpsActionSelect').hide();
			jQuery('#eeSFL_FileOpsActionInput').show();
			jQuery('#eeSFL_FileOpsActionInput').attr('name', 'eeSFL_DeletingFiles');
			jQuery('#eeSFL_FileOpsActionInput').attr('value', '');
			jQuery('#eeSFL_FileOpsActionInput').attr('placeholder', eeSFL_DeleteText);
			jQuery('#eeSFL_FileOpsActionInput').attr('disabled', 'disabled');
			jQuery('#eeSFL_FileOpsActionInput').removeAttr('required');
		
		} else if(jQuery(this).val() == 'Move') {
			
			console.log('Moving Files');
			
			jQuery('#eeSFL_FileOpsActionInput').removeAttr('required');
			jQuery('#eeSFL_FileOpsActionInput').hide();
			jQuery('#eeSFL_FileOpsActionSelect').show();
		
		} else if(jQuery(this).val() == 'Description') {
			
			console.log('Adding Description');
			
			jQuery('#eeSFL_FileOpsActionSelect').hide();
			jQuery('#eeSFL_FileOpsActionInput').show();
			jQuery('#eeSFL_FileOpsActionInput').attr('name', 'eeSFL_Description');
			jQuery('#eeSFL_FileOpsActionInput').attr('value', '');
			jQuery('#eeSFL_FileOpsActionInput').attr('placeholder', eeSFL_DescriptionPlaceholder);
			jQuery('#eeSFL_FileOpsActionInput').attr('required', 'required');
			jQuery('#eeSFL_FileOpsActionInput').removeAttr('disabled');
		
		} else if(jQuery(this).val() == 'Download') {
			
			console.log('Downloading Files');
			
			jQuery('#eeSFL_FileOpsActionSelect').hide();
			jQuery('#eeSFL_FileOpsActionInput').show();
			jQuery('#eeSFL_FileOpsActionInput').attr('name', 'eeSFL_ZipFileName');
			jQuery('#eeSFL_FileOpsActionInput').attr('value', eeSFL_ZipFileName + '.zip');
			jQuery('#eeSFL_FileOpsActionInput').attr('required', 'required');
			jQuery('#eeSFL_FileOpsActionInput').removeAttr('disabled');
		
		} else { // Create Folder
		
			jQuery('#eeSFL_FileOpsActionSelect').hide();
			jQuery('#eeSFL_FileOpsActionInput').show();
			jQuery('#eeSFL_FileOpsActionInput').attr('name', 'eeSFL_NewFolderName');
			jQuery('#eeSFL_FileOpsActionInput').attr('value', '');
			jQuery('#eeSFL_FileOpsActionInput').attr('placeholder', eeSFL_NewFolderNamePlaceholder);
			jQuery('#eeSFL_FileOpsActionInput').attr('required', 'required');
			jQuery('#eeSFL_FileOpsActionInput').removeAttr('disabled');
		}
		
	});
	
	// Bulk Editing Checkboxes
	
	// Check / Uncheck All
	jQuery('#eeSFL_BulkEditAll').on('click', function() {
		
		var eeSFL_FileOpsFiles = '';
		
		if(jQuery('#eeSFL_BulkEditAll').is(':checked')) {
			
			// console.log('Checking all ...');
			jQuery('.eeSFL_BulkEditCheck').prop('checked', jQuery(this).prop('checked'));
			
			// Loop through all checkboxes
			jQuery('.eeSFL_BulkEditCheck').each(function () {
				
				eeSFL_FileOpsFiles += ',' + jQuery(this).val();
			});
			
		} else {
			
			// console.log('Unchecking all ...');
			jQuery('.eeSFL_BulkEditCheck').removeAttr('checked');
		}
		
		jQuery('#eeSFL_FileOpsFiles').val(eeSFL_FileOpsFiles); // Fill the hidden input
	});
	
	
	// Add Files to Bulk Edit List
	jQuery('.eeSFL_BulkEditCheck').on('click', function() {
		
		var eeSFL_BulkFileID = jQuery(this).val(); // This checkbox
		var eeSFL_FileOpsFiles = jQuery('#eeSFL_FileOpsFiles').val(); // The files we're working with
		
		if(eeSFL_BulkFileID) {
			
			if(jQuery('#eeSFL_BulkEdit_' + eeSFL_BulkFileID).is(':checked') ) {
				
				console.log('Bulk Edit File ID ADD: ' + eeSFL_BulkFileID);
				
				eeSFL_FileOpsFiles = eeSFL_FileOpsFiles + ',' + eeSFL_BulkFileID;

			} else {
				
				console.log('Bulk Edit File ID REMOVE: ' + eeSFL_BulkFileID);
				
				eeSFL_FileOpsFiles = eeSFL_FileOpsFiles.replace(',' + eeSFL_BulkFileID, ''); // Remove this ID
			}
		}
		
		jQuery('#eeSFL_FileOpsFiles').val(eeSFL_FileOpsFiles);
		console.log('#eeSFL_FileOpsFiles = ' + eeSFL_FileOpsFiles);
	
	});

}); // END Ready Function



// Copy File URL to Clipboard
function eeSFL_CopyLinkToClipboard(eeSFL_FileURL) {
	
	var eeTemp = jQuery('<input name="eeTemp" value="' + eeSFL_FileURL + '" type="url" class="" id="eeTemp" />'); // Create a temporary input
	jQuery("body").append(eeTemp); // Add it to the bottom of the page
	
	var eeTempInput = jQuery('#eeTemp');
	eeTempInput.focus();
	eeTempInput.select(); // Select the temp input
	// eeTempInput.setSelectionRange(0, 99999); /* For mobile devices <<<------------ TO DO */
	document.execCommand("copy"); // Copy to clipboard
	eeTemp.remove(); // Remove the temp input
    
    alert(eesfl_vars['eeCopyLinkText'] + "\r\n" + eeSFL_FileURL); // Alert the user
}





function eeSFL_DownloadFolder(eeSFL_FolderID, eeSFL_FolderName) {
	
	var eeToday = new Date();
	var eeDay = String(eeToday.getDate()).padStart(2, '0');
	var eeMonth = String(eeToday.getMonth() + 1).padStart(2, '0'); //January is 0!
	var eeYear = eeToday.getFullYear();
	
	jQuery('#eeSFL_FolderToDownload').val(eeSFL_FolderID);
	jQuery('#eeSFL_FolderDownloadZipFileName').val(eeSFL_FolderName + '_' + eeYear + '-' + eeMonth + '-' + eeDay);
	
	// Disable all the links to prevent re-clicks
	jQuery('#eeSFL_RowID-' + eeSFL_FolderID + ' a.eeSFL_FolderDownload').css('color', '#666');
	jQuery('#eeSFL_RowID-' + eeSFL_FolderID + ' a.eeSFL_FolderDownload').text(eesfl_vars['eePleaseWaitText'] + ' ......');
	jQuery('a.eeSFL_FolderDownload').removeAttr('href'); // All of them
	
	jQuery('#eeSFL_DownloadFolderForm').submit();
}





function eeSFL_EditFile(eeSFL_FileID) {
	
	event.preventDefault(); // Don't follow the link
	
	if( jQuery('#eeSFL_EditFileWrap_' + eeSFL_FileID).is(':visible') ) {
		
		jQuery('#eeSFL_EditFileWrap_' + eeSFL_FileID).slideUp();
		jQuery('#eeSFL_EditFile_' + eeSFL_FileID).text(eesfl_vars['eeEditText']);
	
	} else {
		
		jQuery('#eeSFL_EditFileWrap_' + eeSFL_FileID).slideDown();
		jQuery('#eeSFL_EditFile_' + eeSFL_FileID).text(eesfl_vars['eeCancelText']);
	}
}




function eeSFL_EditRename(eeSFL_FileID) {
	
	var eeName1 = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' p.eeSFL_FileLink').text(); // Current File Name
	var eeName2 = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' input.eeNewFileName').val(); // New File Name
	
	if(eeName1 != eeName2) { // If no match, we rename
		
		eeSFL_FileAction(eeSFL_FileID, 'Rename');
	}
	
	jQuery('#eeSFL_EditFileWrap_' + eeSFL_FileID).slideUp();
	jQuery('#eeSFL_EditFile_' + eeSFL_FileID).text(eesfl_vars['eeEditText']);
}

function eeSFL_EditDesc(eeSFL_FileID) {
	
	var eeDesc1 = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' span.eeSFL_SavedDesc').text(); // Current Desc
	var eeDesc2 = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' input.eeSFL_NewFileDesc').val(); // New Desc
	
	if(eeDesc1 != eeDesc2) { // If no match, we update  && !eeRenaming
		
		eeSFL_FileAction(eeSFL_FileID, 'UpdateDesc');
	}
	
	jQuery('#eeSFL_EditFileWrap_' + eeSFL_FileID).slideUp();
	jQuery('#eeSFL_EditFile_' + eeSFL_FileID).text(eesfl_vars['eeEditText']);
}



function eeSFL_EditDate(eeSFL_FileID) {
	
	eeSFL_FileYear = jQuery('#eeSFL_FileYear_' + eeSFL_FileID).val();
	eeSFL_FileMonth = jQuery('#eeSFL_FileMonth_' + eeSFL_FileID).val();
	eeSFL_FileDay = jQuery('#eeSFL_FileDay_' + eeSFL_FileID).val();
	
	if(confirm('Set Date to ' + eeSFL_FileYear + '-' + eeSFL_FileMonth + '-' + eeSFL_FileDay + ' ?')) {
		
		eeSFL_FileAction(eeSFL_FileID, 'UpdateDate');
	
		jQuery('#eeSFL_EditFileWrap_' + eeSFL_FileID).slideUp();
	}
}




// Triggered when you click the Delete link
function eeSFL_Delete(eeSFL_FileID) {
	
	event.preventDefault(); // Don't follow the link
	
	console.log('Deleting File ID #' + eeSFL_FileID);
	
	// Get the File Name
    var eeSFL_FileName = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' .eeSFL_RealFileName').text();
    
    console.log(eeSFL_FileName);
	
	if( confirm( eesfl_vars['eeConfirmDeleteText'] + "\r\n\r\n" + eeSFL_FileName ) ) {
	
		eeSFL_FileAction(eeSFL_FileID, 'Delete');
	
	}

}


function eeSFL_SendFile(eeSFL_FileID) {
	
	event.preventDefault(); // Don't follow the link
    var eeFileName = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' .eeSFL_RealFileName').text(); // Get the File Name
    jQuery('#eeSFL_SendTheseFilesList em').text(eeFileName); // Add it to the list view
    
    console.log( 'Sending: ' + eeFileName + ' (ID: ' + eeSFL_FileID + ')' );
    
	jQuery('#eeSFL_SendMoreFiles input[type=checkbox]').prop("checked", false); // Uncheck all the boxes
	
	jQuery('.eeSFL_AddFileID_' + eeSFL_FileID + ' input[type=checkbox]').prop("checked", true); // Check the first file's box
	
	jQuery('#eeSFL_SendPop').fadeIn();
}

// Close the Overlay
function eeSFL_Send_Cancel() {
	event.preventDefault();
	document.getElementById("eeSFL_SendFileForm").reset();
	jQuery('#eeSFL_SendPop').fadeOut();
}

// Open the File List
function eeSFL_Send_AddMoreFiles() {
	event.preventDefault();
	jQuery('#eeSFL_SendMoreFiles').show();
	jQuery('#eeSFL_SendInfo').slideUp(); // Make room for the list in the overlay
}

// Cancel the File List
function eeSFL_Send_AddMoreCancel() {
	event.preventDefault();
	jQuery('eeSFL_SendMoreFiles input[type=checkbox]').prop("checked", false); // Uncheck all the boxes
	jQuery('.eeSFL_AddFileID_' + eeSFL_FileID + ' input[type=checkbox]').prop("checked", true); // Check the first file's box
	jQuery('#eeSFL_SendInfo').show();
	jQuery('#eeSFL_SendMoreFiles').slideUp();
}

// Approve Added Files
function eeSFL_Send_AddTheseFiles() {
	
	event.preventDefault();
	var eeArray = new Array;
	
	jQuery('#eeSFL_SendInfo').show();
	jQuery('#eeSFL_SendMoreFiles').slideUp();
	
	// Add each to the list display
	jQuery('#eeSFL_SendTheseFilesList em').text(''); // Reset
	
	jQuery('#eeSFL_SendMoreFiles input[type=checkbox]').each(function() { 
		
		if( jQuery(this).is(':checked') ) {
			
			var eeFileName = decodeURIComponent( jQuery(this).val() ); // Decode
			
			if(eeSFL_SubFolder.length >= 1 ) {
				
				if( eeFileName.indexOf(eeSFL_SubFolder) === 0 ) {
					
					eeFileName = eeFileName.replace(eeSFL_SubFolder, '');
				}
			}
			
			eeArray.push(eeFileName);
		}
	});
	
	var eeArrayLength = eeArray.length;
	var eeSendingThese = '';
	
	for(var i = 0; i < eeArrayLength; i++) {
		if(eeArray[i]) {
			eeSendingThese = eeSendingThese + eeArray[i] + ', ';
		}
	}
	
	// Strip last ,	
	eeSendingThese = eeSendingThese.substring(0, eeSendingThese.length - 2);
	
	jQuery('#eeSFL_SendTheseFilesList em').text(eeSendingThese);
}




// AJAX Post to File Engine
function eeSFL_FileAction(eeSFL_FileID, eeSFL_Action) {
	
	event.preventDefault(); // Don't follow link
	
	console.log(eeSFL_Action + ' -> ' + eeSFL_FileID);
	
	// The File Action Engine
	var eeActionEngine = eesfl_vars.ajaxurl;
	
	// Current File Name
	var eeSFL_FileName = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' span.eeSFL_RealFileName').text(); 
	
	// AJAX --------------
	
	// Get the Nonce
	var eeSFL_ActionNonce = jQuery('#eeSFL_ActionNonce').text();
	
	if(eeSFL_Action == 'Rename') {
		
		// Get the new name
		var eeSFL_NewFileName = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' input.eeNewFileName').val();
		
		// Sanitize to match reality
		eeSFL_NewFileName = eeSFL_NewFileName.replace(/ /g, '-'); // Deal with spaces
		eeSFL_NewFileName = eeSFL_NewFileName.replace(/--/g, '-'); // Deal with double dash
		
		if(eeSFL_FileName.indexOf('.') == -1) { // It's a folder
			
			eeSFL_NewFileName = eeSFL_NewFileName.replace(/\./g, '_'); // Replace dots
		
		} else { 
			
			if(eeSFL_NewFileName.indexOf('.') == -1) { // Disallow removing extension
				return false;
			}
			
			// Remove dots from name-part
			var eeArray = eeSFL_NewFileName.split('.');
			
			if(eeArray.length > 2) {
				
				console.log('Problem Filename: ' + eeSFL_NewFileName);
				
				var eeExt = eeArray.pop();
				var eeNewFileName = '';
				
				for(i = 0; i < eeArray.length; i++) {
					eeNewFileName += eeArray[i] + '_';
				}
				eeNewFileName = eeNewFileName.substring(0, eeNewFileName.length - 1); // Strip last dash
				
				eeSFL_NewFileName = eeNewFileName + '.' + eeExt;
			}
		}
	
		var eeFormData = {
			'action': 'simplefilelistpro_edit_job',
			'eeSFL_ID': eeSFL_ListID,
			'eeFileName': eeSFL_FileName,
			'eeSubFolder': eeSFL_SubFolder,
			'eeFileAction': eeSFL_Action + '|' + eeSFL_NewFileName,
			'eeSecurity': eeSFL_ActionNonce
		};
	
	} else if(eeSFL_Action == 'Delete') {
		
		// Get the File Name
		var eeSFL_FileName = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' .eeSFL_RealFileName').text();
		
		var eeFormData = {
			'action': 'simplefilelistpro_edit_job',
			'eeSFL_ID': eeSFL_ListID,
			'eeSubFolder': eeSFL_SubFolder,
			'eeFileName': eeSFL_FileName,
			'eeFileAction': eeSFL_Action,
			'eeSecurity': eeSFL_ActionNonce
		};
	
	} else if(eeSFL_Action == 'UpdateDesc') {
		
		var eeSFL_FileName = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' span.eeSFL_RealFileName').text(); // Name
		
		var eeSFL_FileDesc = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' input.eeSFL_NewFileDesc').val(); // Desc
		
		var eeFormData = {
			'action': 'simplefilelistpro_edit_job',
			'eeSFL_ID': eeSFL_ListID,
			'eeFileAction': eeSFL_Action,
			'eeSubFolder': eeSFL_SubFolder,
			'eeFileName': eeSFL_FileName,
			'eeFileDesc': eeSFL_FileDesc,
			'eeSecurity': eeSFL_ActionNonce
		};	
	
	} else if(eeSFL_Action == 'UpdateDate') {
		
		var eeSFL_FileName = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' span.eeSFL_RealFileName').text(); // Name
		
		var eeFormData = {
			'action': 'simplefilelistpro_edit_job',
			'eeSFL_ID': eeSFL_ListID,
			'eeFileAction': eeSFL_Action,
			'eeSubFolder': eeSFL_SubFolder,
			'eeFileName': eeSFL_FileName,
			'eeFileDate': eeSFL_FileYear + '-' + eeSFL_FileMonth + '-' + eeSFL_FileDay,
			'eeSecurity': eeSFL_ActionNonce
		};	
	}
	
	if(eeSFL_Action && eeFormData) {

		console.log('Calling: ' + eeActionEngine);

		jQuery.post(eeActionEngine, eeFormData, function(response) {
			
			if(response == 'SUCCESS') {
				
				if(eeSFL_Action == 'Rename') {
					
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' .eeNewFileName').val(eeSFL_NewFileName);
					
					var eeFileNameOld = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' span.eeSFL_RealFileName').text();
					
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' span.eeSFL_RealFileName').text(eeSFL_NewFileName);
					
					// Get the current URL
					var eeURL_Old = jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' a.eeSFL_FileName').attr('href');
					
					// Replace old name with new in the URL
					var eeURL_New = eeURL_Old.replace(eeFileNameOld, eeSFL_NewFileName);
					
					// Make a New Link
					var eeNewLink = '<a class="eeSFL_FileName" href="' + eeURL_New + '"';
					
					// Files open in new window
					if( eeFileNameOld.indexOf('.') > 1 ) { eeNewLink = eeNewLink + ' target="_blank"'; }
					eeNewLink = eeNewLink + '>' + eeSFL_NewFileName + '</a>';
					
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' p.eeSFL_FileLink').html(eeNewLink);
					
					// Update the links
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' a.eeSFL_FileOpen').attr('href', eeURL_New);
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' a.eeSFL_FileDownload').attr('href', eeURL_New);
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' a.eeFileIcon').attr('href', eeURL_New);
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' a.eeFolderIcon').attr('href', eeURL_New);
					
				} else if (eeSFL_Action == 'Delete') {
					
					jQuery('#eeSFL_RowID-' + eeSFL_FileID).hide('slow');
					
				} else if(eeSFL_Action == 'UpdateDesc') {
					
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' p.eeSFL_FileDesc').show();
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' p.eeSFL_FileDesc').html(eeSFL_FileDesc);
				
				} else if(eeSFL_Action == 'UpdateDate') {
					
					// Update tables's date column value
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' .eeSFL_FileDate').text('(' + eeSFL_FileYear + '-' + eeSFL_FileMonth + '-' + eeSFL_FileDay + ')');
					jQuery('#eeSFL_RowID-' + eeSFL_FileID + ' .eeSFL_DetailDate').text('(' + eeSFL_FileYear + '-' + eeSFL_FileMonth + '-' + eeSFL_FileDay + ')');
				}
			
			} else {
				alert(response);
			}
		});
	}
}

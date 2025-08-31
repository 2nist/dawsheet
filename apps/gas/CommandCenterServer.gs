function openCommandCenter(){
	const html = HtmlService.createHtmlOutputFromFile('CommandCenterUI').setTitle('DAWSheet Command Center');
	SpreadsheetApp.getUi().showSidebar(html);
}

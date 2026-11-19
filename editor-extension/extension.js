const vscode = require('vscode');
const path = require('node:path');
function activate(context) {
  for(const action of ['run','check'])context.subscriptions.push(vscode.commands.registerCommand('zuno.'+action,async()=>{
    const document=vscode.window.activeTextEditor?.document;
    if(!document||document.languageId!=='zuno')return vscode.window.showInformationMessage('Open a .zuno file first.');
    if(document.isUntitled){if(!await document.save())return;}
    else if(document.isDirty&&!await document.save())return;
    const node=vscode.workspace.getConfiguration('zuno').get('nodePath','node');
    const execution=new vscode.ProcessExecution(node,[path.join(context.extensionPath,'runtime','cli.js'),action,document.uri.fsPath]);
    const task=new vscode.Task({type:'zuno',action},vscode.TaskScope.Workspace,'Zuno: '+action,'Zuno',execution);
    await vscode.tasks.executeTask(task);
  }));
}
module.exports = { activate };

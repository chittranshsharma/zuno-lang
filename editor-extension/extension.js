const vscode = require('vscode');
const path = require('node:path');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
let client;
async function activate(context) {
  for(const command of ['run','check','runProject','checkProject','testProject'])context.subscriptions.push(vscode.commands.registerCommand('zuno.'+command,async()=>{
    const action=command.startsWith('run')?'run':command.startsWith('test')?'test':'check';
    const project=command.endsWith('Project');
    const document=vscode.window.activeTextEditor?.document;
    const folder=document&&vscode.workspace.getWorkspaceFolder(document.uri)||vscode.workspace.workspaceFolders?.[0];
    if(project){if(!folder)return vscode.window.showInformationMessage('Open a Zuno project folder first.');if(!await vscode.workspace.saveAll(false))return;}
    else {
      if(!document||document.languageId!=='zuno')return vscode.window.showInformationMessage('Open a .zuno file first.');
      if(document.isUntitled){if(!await document.save())return;}
      else if(document.isDirty&&!await document.save())return;
    }
    const node=vscode.workspace.getConfiguration('zuno').get('nodePath','node');
    const execution=new vscode.ProcessExecution(node,[path.join(context.extensionPath,'runtime','cli.js'),action,project?folder.uri.fsPath:document.uri.fsPath]);
    const task=new vscode.Task({type:'zuno',action},vscode.TaskScope.Workspace,'Zuno: '+action,'Zuno',execution);
    task.problemMatchers=['$zuno'];
    await vscode.tasks.executeTask(task);
  }));
  const server = { module: path.join(context.extensionPath, 'dist', 'server.js'), transport: TransportKind.ipc };
  const sourceWatcher = vscode.workspace.createFileSystemWatcher('**/*.zuno');
  const projectWatcher = vscode.workspace.createFileSystemWatcher('**/zuno.json');
  context.subscriptions.push(sourceWatcher, projectWatcher);
  client = new LanguageClient('zuno', 'Zuno Language Server', server, {
    documentSelector: [{ scheme: 'file', language: 'zuno' }, { scheme: 'untitled', language: 'zuno' }],
    synchronize: { fileEvents: [sourceWatcher, projectWatcher] }
  });
  await client.start();
}
function deactivate() { return client?.stop(); }
module.exports = { activate, deactivate };

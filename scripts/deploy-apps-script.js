#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const {google} = require('googleapis');

async function main(){
  const args = process.argv.slice(2);
  if(args.length < 2){
    console.error('Usage: node deploy-apps-script.js <SCRIPT_ID> <ROOT_DIR>');
    process.exit(2);
  }
  const [scriptId, rootDir] = args;
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(workspace, 'sa.json');

  if(!fs.existsSync(saPath)){
    console.error('Service account JSON not found at', saPath);
    process.exit(3);
  }

  const fullRoot = path.isAbsolute(rootDir) ? rootDir : path.join(workspace, rootDir);
  if(!fs.existsSync(fullRoot)){
    console.error('Root directory does not exist:', fullRoot);
    process.exit(4);
  }

  // collect files
  const files = [];
  const entries = fs.readdirSync(fullRoot);
  for(const fname of entries){
    const fpath = path.join(fullRoot, fname);
    const stat = fs.statSync(fpath);
    if(stat.isDirectory()) continue;
    if(fname === '.clasp.json' || fname === 'README.md') continue;
    const ext = path.extname(fname).toLowerCase();
    let type = null;
    let name = path.basename(fname, ext);
    if(fname === 'appsscript.json'){
      name = 'appsscript';
      type = 'JSON';
    } else if(ext === '.gs' || ext === '.js' || ext === '.ts'){
      type = 'SERVER_JS';
    } else if(ext === '.html'){
      type = 'HTML';
    } else if(ext === '.json'){
      // skip other json files except appsscript
      continue;
    } else {
      // skip unknown files
      continue;
    }

    const source = fs.readFileSync(fpath, 'utf8');
    files.push({name, type, source});
  }

  if(files.length === 0){
    console.error('No files found to deploy in', fullRoot);
    process.exit(5);
  }

  // authenticate
  const auth = new google.auth.GoogleAuth({
    keyFile: saPath,
    scopes: ['https://www.googleapis.com/auth/script.projects']
  });
  const client = await auth.getClient();
  const script = google.script({version: 'v1', auth: client});

  try{
    console.log('Deploying', files.length, 'files to scriptId', scriptId);
    const res = await script.projects.updateContent({
      scriptId,
      requestBody: {files}
    });
    console.log('Deployment response status:', res.status);
    console.log('Deployment response data:', JSON.stringify(res.data, null, 2));
    console.log('Deploy succeeded');
    process.exit(0);
  }catch(err){
    console.error('Deploy failed:', err.message || err);
    if(err.response && err.response.data) console.error('API response:', JSON.stringify(err.response.data));
    process.exit(10);
  }
}

main();

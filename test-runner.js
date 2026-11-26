const { sourceFiles } = require('./workspace-files');
const { runProject } = require('./project');

function testProject(input, cwd) {
  const files = sourceFiles(input, '.test.zuno', cwd);
  if (!files.length) throw new Error('No *.test.zuno files found. Add a test that calls assert(condition, message).');
  const results = files.map(file => {
    try { return { file, passed: true, output: runProject(file).output }; }
    catch (error) { return { file, passed: false, error: error.message }; }
  });
  return { results, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length };
}

module.exports = { testProject };

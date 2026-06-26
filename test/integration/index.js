const vscode = require('vscode')

async function run() {
  console.log('=== DeepTab Integration Tests ===\n')

  const ext = vscode.extensions.getExtension('deeptab.deeptab')
  if (!ext) {
    throw new Error('Extension not found. Check package.json publisher and name.')
  }

  await ext.activate()
  if (!ext.isActive) {
    throw new Error('Extension did not activate')
  }
  console.log('  PASS: Extension activates')

  const config = vscode.workspace.getConfiguration('deeptab')
  const model = config.get('model')
  if (model !== 'deepseek-chat') {
    throw new Error(`Expected default model "deepseek-chat", got "${model}"`)
  }
  console.log(`  PASS: Default model is "${model}"`)

  console.log('\nAll integration tests passed!')
}

module.exports = { run }

const assert=require('node:assert/strict')
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const source=fs.readFileSync('lib/file-folder-module-connections.ts','utf8')
const moduleBox={exports:{}}
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:1,target:9}}).outputText,{module:moduleBox,exports:moduleBox.exports})
const {validateFileFolderModuleConnection}=moduleBox.exports
const base={actorIsClientOwner:true,sourceIsActive:true,targetIsActive:true}
assert.deepEqual(JSON.parse(JSON.stringify(validateFileFolderModuleConnection({...base,sourceType:'commerce_storefront',targetType:'marketplace_network'}))),{ok:true,contract:'order',state:'configured_pending_runtime_adapter'})
assert.equal(validateFileFolderModuleConnection({...base,sourceType:'unknown',targetType:'marketplace_network'}).ok,false)
assert.match(validateFileFolderModuleConnection({...base,sourceType:'commerce_storefront',targetType:'marketplace_network',actorIsClientOwner:false}).reason,/owning Client/)
assert.match(validateFileFolderModuleConnection({...base,sourceType:'commerce_storefront',targetType:'marketplace_network',sourceIsActive:false}).reason,/Both systems must be active/)
assert.match(validateFileFolderModuleConnection({...base,sourceType:'payments_gateway',targetType:'commerce_storefront'}).reason,/does not match/)
assert.equal(validateFileFolderModuleConnection({...base,sourceType:'creator_booth',targetType:'broadcast_studio'}).contract,'media_asset')
assert.equal(validateFileFolderModuleConnection({...base,sourceType:'transport_coordination',targetType:'data_room'}).contract,'delivery_status')
console.log('File Folder module connections: owner gate, active-system gate, registered contracts, compatible edges and runtime-adapter boundary passed')

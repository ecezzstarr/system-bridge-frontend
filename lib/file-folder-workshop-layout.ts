import type {WorldObstacle} from './file-folder-world-runtime'
// The front wall blocks the body but remains open above floor level for the chase camera.
export const FILE_FOLDER_WORKSHOP_WALLS:WorldObstacle[]=[
 {x:-4,z:0,radius:0,halfWidth:.15,halfDepth:5,height:3},
 {x:4,z:0,radius:0,halfWidth:.15,halfDepth:5,height:3},
 {x:0,z:-5,radius:0,halfWidth:4,halfDepth:.15,height:3},
 {x:0,z:5,radius:0,halfWidth:4,halfDepth:.15,height:.1},
 {x:0,z:-2,radius:0,halfWidth:1.4,halfDepth:.55,height:1.1},
]
export const FILE_FOLDER_WORKBENCH:[number,number,number]=[0,0,-.7]

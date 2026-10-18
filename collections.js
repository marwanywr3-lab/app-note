export function collectionNotes(records,folderId){return records.filter(r=>r.kind==='note'&&!r.deleted&&r.data.folder===folderId)}
export function assignCollection(records,folderId,selectedIds){
 if(!records.some(r=>r.id===folderId&&r.kind==='folder'&&!r.deleted))throw Error('Folder unavailable');
 const selected=new Set(selectedIds),changed=[];
 for(const r of records){if(r.kind!=='note'||r.deleted)continue;const target=selected.has(r.id)?folderId:r.data.folder===folderId?null:r.data.folder;if(target!==r.data.folder){r.data.folder=target;changed.push(r)}}return changed;
}
export function moveNotes(records,ids,folderId){
 if(folderId&&!records.some(r=>r.id===folderId&&r.kind==='folder'&&!r.deleted))throw Error('Folder unavailable');
 const selected=new Set(ids),changed=[];for(const r of records){if(r.kind==='note'&&!r.deleted&&selected.has(r.id)&&r.data.folder!==(folderId||null)){r.data.folder=folderId||null;changed.push(r)}}return changed;
}
export function trashRecords(records,ids){const selected=new Set(ids);return records.filter(r=>['note','chat'].includes(r.kind)&&!r.deleted&&selected.has(r.id)).map(r=>{r.deleted=true;return r})}
export function collectionBackup(records,folderId){const folder=records.find(r=>r.id===folderId&&r.kind==='folder'&&!r.deleted);if(!folder)throw Error('Folder unavailable');return {app:'appnote',version:1,records:structuredClone([folder,...collectionNotes(records,folderId)])};}

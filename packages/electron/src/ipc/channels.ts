/** IPC channel names shared between main and renderer */
export const IPC = {
  INIT: 'aide:init',
  ADD: 'aide:add',
  REMOVE: 'aide:remove',
  APPLY: 'aide:apply',
  LIST: 'aide:list',
  LINK: 'aide:link',
  UNLINK: 'aide:unlink',
  SYNC: 'aide:sync',
  READ_REGISTRY: 'aide:readRegistry',
  READ_CONFIG: 'aide:readConfig',
  DISCOVER: 'aide:discover',
} as const

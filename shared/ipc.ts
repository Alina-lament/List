export const IpcChannels = {
  tasksGetByDateRange: 'tasks:getByDateRange',
  tasksGetByList: 'tasks:getByList',
  tasksGetById: 'tasks:getById',
  tasksCreate: 'tasks:create',
  tasksUpdate: 'tasks:update',
  tasksUpdateDueDate: 'tasks:updateDueDate',
  tasksReorder: 'tasks:reorder',
  tasksSetCompleted: 'tasks:setCompleted',
  tasksDelete: 'tasks:delete',
  tasksCreateException: 'tasks:createException',
  listsGetAll: 'lists:getAll',
  listsCreate: 'lists:create',
  listsUpdate: 'lists:update',
  listsDelete: 'lists:delete',
  listsReorder: 'lists:reorder',
  tagsGetAll: 'tags:getAll',
  tagsGetAllTaskTags: 'tags:getAllTaskTags',
  tagsCreate: 'tags:create',
  tagsDelete: 'tags:delete',
  tagsAddToTask: 'tags:addToTask',
  tagsRemoveFromTask: 'tags:removeFromTask',
  remindersGetDue: 'reminders:getDue',

  // settings
  settingsGetAll: 'settings:getAll',
  settingsUpdate: 'settings:update',

  // file dialogs
  dialogOpenImageFile: 'dialog:openImageFile',

  // icons
  iconsGetFolder: 'icons:getFolder',
  iconsList: 'icons:list',
  iconsOpenFolder: 'icons:openFolder',
  iconsSetApp: 'icons:setApp',
  iconsGetDataUrl: 'icons:getDataUrl',

  // background image
  bgSetImage: 'bg:setImage',
  bgGetImagePath: 'bg:getImagePath',
  bgClearImage: 'bg:clearImage',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

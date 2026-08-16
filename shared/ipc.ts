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
  listsSetIcon: 'lists:setIcon',
  listsGetIconDataUrl: 'lists:getIconDataUrl',
  listsListBuiltinIcons: 'lists:listBuiltinIcons',
  listsListCustomIcons: 'lists:listCustomIcons',
  tagsGetAll: 'tags:getAll',
  tagsGetAllTaskTags: 'tags:getAllTaskTags',
  tagsCreate: 'tags:create',
  tagsDelete: 'tags:delete',
  tagsAddToTask: 'tags:addToTask',
  tagsRemoveFromTask: 'tags:removeFromTask',
  remindersGetDue: 'reminders:getDue',

  // settings
  settingsGetAll: 'settings:getAll',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',

  // backup
  backupSelectFolder: 'backup:selectFolder',
  backupGetStatus: 'backup:getStatus',
  backupSetPath: 'backup:setPath',
  backupClearPath: 'backup:clearPath',

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
  bgGetImageDataUrl: 'bg:getImageDataUrl',
  bgClearImage: 'bg:clearImage',

  // sounds
  soundsGetFolder: 'sounds:getFolder',
  soundsList: 'sounds:list',
  soundsGetDataUrl: 'sounds:getDataUrl',

  // tomato style
  tomatoesGetFolder: 'tomatoes:getFolder',
  tomatoesList: 'tomatoes:list',
  tomatoesOpenFolder: 'tomatoes:openFolder',
  tomatoesSetImage: 'tomatoes:setImage',
  tomatoesGetDataUrl: 'tomatoes:getDataUrl',

  // brand
  brandSetImage: 'brand:setImage',
  brandGetDataUrl: 'brand:getDataUrl',
  brandClearImage: 'brand:clearImage',

  // daily routines
  dailyGetAll: 'daily:getAll',
  dailyCreate: 'daily:create',
  dailyUpdate: 'daily:update',
  dailyDelete: 'daily:delete',
  dailyGetCompletions: 'daily:getCompletions',
  dailyGetCompletionsByRange: 'daily:getCompletionsByRange',
  dailyIncrement: 'daily:increment',
  dailyDecrement: 'daily:decrement',

  // journal
  journalGetByDate: 'journal:getByDate',
  journalGetByDateRange: 'journal:getByDateRange',
  journalSave: 'journal:save',
  journalDelete: 'journal:delete',
  journalGetLastYear: 'journal:getLastYear',
  journalGetMarkedDates: 'journal:getMarkedDates',

  // countdowns
  countdownGetAll: 'countdown:getAll',
  countdownCreate: 'countdown:create',
  countdownUpdate: 'countdown:update',
  countdownDelete: 'countdown:delete',
  countdownAdvance: 'countdown:advance',
  countdownSetBg: 'countdown:setBg',
  countdownGetBgDataUrl: 'countdown:getBgDataUrl',

  // pomodoro
  pomodoroCreateRecord: 'pomodoro:createRecord',
  pomodoroDeleteRecord: 'pomodoro:deleteRecord',
  pomodoroGetTodayRecords: 'pomodoro:getTodayRecords',
  pomodoroGetRecentRecords: 'pomodoro:getRecentRecords',
  pomodoroGetTotalStats: 'pomodoro:getTotalStats',
  pomodoroGetStatsByTaskIds: 'pomodoro:getStatsByTaskIds',
  pomodoroNotify: 'pomodoro:notify',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

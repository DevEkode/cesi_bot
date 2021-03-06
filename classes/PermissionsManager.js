const appRoot = require('app-root-path');
const NotAllowedError = require(appRoot+'/Exceptions/NotAllowedError')

module.exports = class PermissionsManager {
    constructor() {
        this.admin_role = "BotAdmin"
    }

    checkPermission(message){
        if(!this.hasPermission(message)) throw new NotAllowedError;
    }

    hasPermission(message){
        let member = message.member;
        let roles = member.roles;

        return roles.cache.some(role => role.name === this.admin_role)
    }


}
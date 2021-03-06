const appRoot = require('app-root-path');
const moment = require('moment');
moment.locale('fr')
const db = require(appRoot+'/models/index');
const Op = db.Sequelize.Op;

const ArgumentValidationError = require(appRoot+'/Exceptions/ArgumentValidationError')

module.exports = class PeriodesSupervisor{
    constructor(date) {
        this.date = this.parseDate(date);
    }

    /**
     * Parse the date argument (DD/MM/YYYY)
     * @param date
     * @returns {Date}
     */
    parseDate(date){
        let parsed_date = moment(date, "DD/MM/YYYY",true);
        if(parsed_date.isValid()) return parsed_date.toDate()
        else{
            throw new ArgumentValidationError();
        }
    }

    /**
     * Get every time period for the day argument
     * @param callback
     */
    getPeriodesList(callback){
        let day_start = moment(this.date).startOf("day").toDate();
        let day_end = moment(this.date).endOf("day").toDate();
        db.Periode.findAll({
            where : {
                debut : {[Op.between]:[day_start,day_end]}
            }
        }).then(periodes => {
            callback(periodes);
        });
    }

    generatePresenceStat(presences){
        let nb_presents = 0;
        let nb_absents = 0;
        presences.forEach(presences => {
            let present_id = 1;
            let absent_id = 2;

            switch (presences.get('StatutId')) {
                case present_id: nb_presents++; break;
                case absent_id: nb_absents++; break;
            }
        })

        return nb_absents+' / '+nb_presents;
    }

    /**
     * Generate lines for the embed
     * @param periodes
     * @returns {{intervals: string, stats: string, ids: string}}
     */
    generateEmbedLines(periodes,callback){
        let result_array = [];
        periodes.forEach((periode,i) => {
            periode.getPresences().then(presences => {
                let stat = this.generatePresenceStat(presences);
                let id = periode.get('id');
                let start = moment(periode.get('debut'));
                let end = moment(periode.get('fin'));
                let interval = start.format('LT')+' - '+end.format('LT');

                let line = {
                    "id" : id,
                    "interval": interval,
                    "stat": stat
                }
                result_array.push(line);

                if(i >= periodes.length-1){
                    callback(this.formatLines(result_array));
                }
            })
        })
    }

    /**
     * Format lines for the embed
     * @param lines
     * @returns {{intervals: string, stats: string, ids: string}}
     */
    formatLines(lines){
        let result = {
            "ids" : "",
            "intervals": "",
            "stats": ""
        }

        lines.forEach((line,i) => {
            let breaker = '\n';
            if(i >= lines.length - 1) breaker = '';

            result['ids'] += line['id']+breaker
            result['intervals'] += line['interval']+breaker
            result['stats'] += line['stat']+breaker
        });

        return result;
    }

    /**
     * Generate the !viewperiodes embed
     * @param callback
     */
    generateViewPeriodesEmbed(callback){
        let title_date = moment(this.date).format('L');
        this.getPeriodesList(week_periodes => {
            let embed;
            if(week_periodes.length > 0){
                this.generateEmbedLines(week_periodes,lines => {
                    embed =  {
                        "title": "Périodes du "+title_date,
                        "description": "Entrez `!viewperiode <ID>` pour obtenir les détails",
                        "url": "https://github.com/DevEkode/cesi_bot",
                        "color": 10071592,
                        "timestamp": new Date(),
                        "author": {
                            "name": "CESI Bot",
                            "url": "https://github.com/DevEkode/cesi_bot",
                            "icon_url": "https://puu.sh/G2gn6/c26897ba03.png"
                        },
                        "fields": [
                            {
                                "name": "ID",
                                "value": lines['ids'],
                                "inline": true
                            },
                            {
                                "name": "Intervalle",
                                "value": lines['intervals'],
                                "inline": true
                            },
                            {
                                "name": "Absents / Présents",
                                "value": lines['stats'],
                                "inline": true
                            }
                        ]
                    };
                    callback(embed);
                });
            }else{
                embed =  {
                    "title": "Périodes du "+title_date,
                    "url": "https://github.com/DevEkode/cesi_bot",
                    "color": 10071592,
                    "timestamp": new Date(),
                    "author": {
                        "name": "CESI Bot",
                        "url": "https://github.com/DevEkode/cesi_bot",
                        "icon_url": "https://puu.sh/G2gn6/c26897ba03.png"
                    },
                    "fields": [
                        {
                            "name": "Aucune période enregistrée pour cette date",
                            "value": "Utilisez `!askpresences <HH:MM> <HH:MM>` pour créer une nouvelle période",
                        }
                    ]
                };
                callback(embed);
            }
        });


    }


}
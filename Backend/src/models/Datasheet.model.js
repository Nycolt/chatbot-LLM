/**
 * Modelo de Usuario usando Sequelize para MySQL
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const properties = {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },

    UNIT: {
        type: DataTypes.STRING(250),            //Tipo cadena de texto con longitud máxima de 250 caracteres 
        allowNull: false,                       //No permite valores nulos 
        validate: {
            notEmpty: {
                msg: 'El UNIT es requerido',        //Valida que no esté vacío
            },
            len: {
                args: [1, 250],
                msg: 'El UNIT no puede exceder 250 caracteres',   //Valida la longitud máxima
            },
        },
    },
    
    SKU: {
        type: DataTypes.STRING(250),            //Tipo cadena de texto con longitud máxima de 250 caracteres 
        allowNull: false,                       //No permite valores nulos 
        validate: {
            notEmpty: {
                msg: 'El SKU es requerido',        //Valida que no esté vacío
            },
            len: {
                args: [1, 250],
                msg: 'El SKU no puede exceder 250 caracteres',   //Valida la longitud máxima
            },
        },
    },

    Firewall_Throughput_UDP: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    IPSec_VPN_Throughput: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    IPS_Throughput_Enterprise_Mix: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    NGFW_Throughput_Enterprise_Mix: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Threat_Protection_Throughput: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Firewall_Latency: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Concurrent_Sessions: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    New_Sessions_Per_Second: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Firewall_Policies: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Max_Gateway_To_Gateway_IPSec_Tunnels: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Max_Client_To_Gateway_IPSec_Tunnels: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    SSL_VPN_Throughput: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Concurrent_SSL_VPN_Users: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    SSL_Inspection_Throughput: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Application_Control_Throughput: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Max_FortiAPs: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Max_FortiSwitches: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Max_FortiTokens: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Virtual_Domains: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Interfaces: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Local_Storage: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Power_Supplies: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Form_Factor: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },

    Variants: {
        type: DataTypes.STRING(250),        //Campo de texto con longitud máxima de 250 caracteres
    },
}

const Datasheet = sequelize.define('Datasheet', {
    ...properties
}, {
    tableName: 'Datasheet',
    timestamps: true,
});

const DatasheetTemp = sequelize.define('DatasheetTemporal', {
    ...properties
}, {
    tableName: 'DatasheetTemporal',
    timestamps: true,
});

export { DatasheetTemp, Datasheet };

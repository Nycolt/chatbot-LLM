/**
 * Modelo de Usuario usando Sequelize para MySQL
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Product = sequelize.define('Producto', {
    id: {
        type: DataTypes.INTEGER,      //Tipo entero (INT)
        primaryKey: true,             //Clave primaria
        autoIncrement: true,          //Auto incremento
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
    Familia: {
        type: DataTypes.STRING(100),            //Tipo cadena de texto con longitud máxima de 250 caracteres 
        allowNull: false,                       //No permite valores nulos 
        validate: {
            notEmpty: {
                msg: 'La Familia es requerida',        //Valida que no esté vacío
            },
            len: {
                args: [1, 100],
                msg: 'La Familia no puede exceder 100 caracteres',   //Valida la longitud máxima
            },
        },
    },
    Descripcion: {
        type: DataTypes.TEXT,   //Tipo cadena de texto con longitud máxima de 1000 caracteres 
        allowNull: true,        //No permite valores nulos 
    },
    Price: {
        type: DataTypes.STRING(20),                                 //Tipo cadena de texto con longitud máxima de 20 caracteres 
        allowNull: true,                                            //No permite valores nulos 
        validate: {
            len: {
                args: [1, 20],
                msg: 'El Price no puede exceder 20 caracteres',     //Valida la longitud máxima
            },
        },
    },
    OneYearContract: {
        type: DataTypes.STRING(20),                                 //Tipo cadena de texto con longitud máxima de 20 caracteres 
        allowNull: true,                                            //No permite valores nulos 
        validate: {
            len: {
                args: [1, 20],
                msg: 'El Price no puede exceder 20 caracteres',     //Valida la longitud máxima
            },
        },
    },
    ThirdYearContract: {
        type: DataTypes.STRING(20),                                 //Tipo cadena de texto con longitud máxima de 20 caracteres 
        allowNull: true,                                            //No permite valores nulos 
        validate: {
            len: {
                args: [1, 20],
                msg: 'El Price no puede exceder 20 caracteres',     //Valida la longitud máxima
            },
        },
    },
    FiveYearContract: {
        type: DataTypes.STRING(20),                                 //Tipo cadena de texto con longitud máxima de 20 caracteres 
        allowNull: true,                                            //No permite valores nulos 
        validate: {
            len: {
                args: [1, 20],
                msg: 'El Price no puede exceder 20 caracteres',     //Valida la longitud máxima
            },
        },
    },
}, {
    tableName: 'Producto',
    timestamps: true,
});


export default Product;

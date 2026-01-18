/**
 * Modelo de Usuario usando Sequelize para MySQL
 */

import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
//import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {

  id: {
    type: DataTypes.INTEGER,      //Tipo entero (INT)
    primaryKey: true,             //Clave primaria
    autoIncrement: true,          //Auto incremento
  },
  Usuario: {
    type: DataTypes.STRING(50),           //Tipo cadena de texto con longitud máxima de 50 caracteres 
    allowNull: false,                     //No permite valores nulos 
    validate: {
      notEmpty: {
        msg: 'El nombre es requerido',    //Valida que no esté vacío
      },
      len: {
        args: [1, 50],
        msg: 'El nombre no puede exceder 50 caracteres',   //Valida la longitud máxima
      },
    },
  },
  Credencial: {
    type: DataTypes.STRING,             //Tipo cadena de texto    
    allowNull: false,                   //No permite valores nulos
    validate: {
      len: {
        args: [8],
        msg: 'La contraseña debe tener al menos 8 caracteres',  //Valida la longitud mínima
      },
    },
  },
}, {
  tableName: 'Usuario',
  timestamps: false,
  defaultScope: {
    attributes: { exclude: ['Credencial'] },
  },
  scopes: {
    withPassword: {
      attributes: { include: ['Credencial'] },
    },
  },
});




// Hook para hashear la contraseña antes de crear
/* User.beforeCreate(async (user) => {
  if (user.password) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
}); */


// Hook para hashear la contraseña antes de actualizar
/* User.beforeUpdate(async (user) => {
  if (user.changed('credencial')) {
    const salt = await bcrypt.genSalt(10);
    user.credencial = await bcrypt.hash(user.credencial, salt);
  }
});

// Método de instancia para comparar contraseñas
User.prototype.comparePassword = async function(credencial) {
  return await bcrypt.compare(credencial, this.credencial);
}; */

export default User;

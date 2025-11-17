import { DataTypes } from 'sequelize';
// Importe com a extensão .js no final
import sequelize from '../config/database.js';

const Responsavel = sequelize.define('Responsavel', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nome: {
        type: DataTypes.STRING,
        field: 'nome'
    },
    cpf: {
        type: DataTypes.STRING,
        field: 'cpf'
    },
    email: {
        type: DataTypes.STRING,
        field: 'email'
    }
}, {
    tableName: 'responsavel',
    timestamps: false
});

export default Responsavel;
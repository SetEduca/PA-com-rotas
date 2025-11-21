import { DataTypes } from 'sequelize';
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
    },

    // --- CAMPO ADICIONADO ---
    // (Ajuste o "field" se o nome da coluna no Supabase for diferente)
    asaasCustomerId: {
        type: DataTypes.STRING,
        field: 'asaascustomerid',
        allowNull: true // <--- DEIXE ASSIM (Permite ficar vazio)
    }
    
}, {
    tableName: 'responsavel',
    timestamps: false
});

export default Responsavel;
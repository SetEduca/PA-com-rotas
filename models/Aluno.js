// Alterado de 'require' para 'import'
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js'; // Adicionado .js

const Aluno = sequelize.define('Aluno', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    nomeCrianca: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nomeResponsavel: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // ... outros dados da matrícula (CPF, email, etc.)

    // --- A "PONTE" ---
    // Aqui vamos guardar o ID que o Asaas criou (ex: cus_12345)
    asaasCustomerId: {
        type: DataTypes.STRING,
        allowNull: true // Fica nulo até a sincronização
    }
});

// Alterado de 'module.exports' para 'export default'
export default Aluno;
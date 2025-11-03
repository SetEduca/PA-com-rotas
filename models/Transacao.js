// Alterado de 'require' para 'import'
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js'; // Adicionado .js

const Transacao = sequelize.define('Transacao', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    descricao: {
        type: DataTypes.STRING,
        allowNull: false
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    categoria: {
        type: DataTypes.STRING
    },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false
    }
    // A chave extra e o comentário que estavam aqui foram removidos.
});

// O comentário pertence aqui fora:
// Esta tabela é só para Despesas. As Receitas vivem no Asaas.

// Alterado de 'module.exports' para 'export default'
export default Transacao;
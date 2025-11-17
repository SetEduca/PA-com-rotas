import { DataTypes } from 'sequelize';
// Importe com a extensão .js no final
import sequelize from '../config/database.js';
import Responsavel from './Responsavel.js'; // <-- .js é obrigatório

const Aluno = sequelize.define('Aluno', {
    // ... (Colunas id, nomeCrianca, asaasCustomerId, etc. com "field:")
    // (O conteúdo que você já tem aqui está correto)
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nomeCrianca: { type: DataTypes.STRING, allowNull: false, field: 'nome' },
    dataNascimento: { type: DataTypes.DATEONLY, field: 'data_nascimento' },
    asaasCustomerId: { type: DataTypes.STRING, field: 'asaascustomerid' },
    cpf: { type: DataTypes.STRING, field: 'cpf' },
    sexo: { type: DataTypes.STRING, field: 'sexo' },
    naturalidade: { type: DataTypes.STRING, field: 'naturalidade' },
    responsavelId: { type: DataTypes.INTEGER, field: 'responsavel_id' }
}, {
    tableName: 'cadastro_crianca', 
    timestamps: false 
});

// A associação (JOIN)
Aluno.belongsTo(Responsavel, { foreignKey: 'responsavelId', as: 'responsavel' });

export default Aluno;
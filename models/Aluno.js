import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import Responsavel from './Responsavel.js'; 

const Aluno = sequelize.define('Aluno', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nomeCrianca: { type: DataTypes.STRING, allowNull: false, field: 'nome' },
    dataNascimento: { type: DataTypes.DATEONLY, field: 'data_nascimento' },
    cpf: { type: DataTypes.STRING, field: 'cpf' },
    sexo: { type: DataTypes.STRING, field: 'sexo' },
    naturalidade: { type: DataTypes.STRING, field: 'naturalidade' },
    responsavelId: { type: DataTypes.INTEGER, field: 'responsavel_id' }

    // --- ATENÇÃO: NÃO DEVE TER 'asaasCustomerId' AQUI ---

}, {
    tableName: 'cadastro_crianca', 
    timestamps: false 
});

// A associação TEM que estar aqui
Aluno.belongsTo(Responsavel, { foreignKey: 'responsavelId', as: 'responsavel' });

export default Aluno;
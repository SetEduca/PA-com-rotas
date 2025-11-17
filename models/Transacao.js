import { DataTypes } from 'sequelize';
// Importe com a extensão .js no final
import sequelize from '../config/database.js';

const Transacao = sequelize.define('Transacao', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    descricao: { type: DataTypes.STRING, allowNull: false },
    valor: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    categoria: { type: DataTypes.STRING },
    data: { type: DataTypes.DATEONLY, allowNull: false }
});

export default Transacao;
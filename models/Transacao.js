import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

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
    }, 
    
    // --- O NOVO CAMPO ATIVO ---
    ativo: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    }
}, {
    // --- CONFIGURAÇÕES QUE FALTAVAM ---
    tableName: 'Transacaos', // Garante que busca na tabela certa
    timestamps: true // Se sua tabela tiver createdAt/updatedAt (se não tiver, mude para false)
});

export default Transacao;
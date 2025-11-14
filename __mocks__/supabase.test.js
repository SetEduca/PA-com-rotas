// Isso é um mock "manual" do Supabase.
// Vamos criar funções "jest.fn()" que podemos espionar.

// Criamos as funções de forma encadeada, assim como o Supabase real
const mockOrder = jest.fn(() => ({ data: [], error: null }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

const mockSingle = jest.fn(() => ({ data: { id: 1 }, error: null }));
const mockSelectComSingle = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn(() => ({ select: mockSelectComSingle }));

const mockDelete = jest.fn(() => ({ error: null }));
const mockUpdate = jest.fn(() => ({ error: null }));

const mockFrom = jest.fn((tableName) => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));

// Exportamos o objeto falso
export default {
  from: mockFrom
};
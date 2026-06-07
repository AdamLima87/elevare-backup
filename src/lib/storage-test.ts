import { Resposta, Inspecao, Estabelecimento, Funcionario, QuestionarioEstab } from "./storage";

export function testInspecaoFlow() {
  const NUMEROS_DISPONIVEIS_KEY = "elevare_numeros_disponiveis";
  const PROXIMO_NUMERO_KEY = "elevare:proximo_numero";
  const HISTORICO_KEY = "elevare_inspecoes";
  const RASCUNHO_KEY = "elevare:rascunho";

  console.log("Starting Storage Tests...");

  // 1. Clear state
  localStorage.removeItem(NUMEROS_DISPONIVEIS_KEY);
  localStorage.removeItem(PROXIMO_NUMERO_KEY);
  localStorage.removeItem(HISTORICO_KEY);
  localStorage.removeItem(RASCUNHO_KEY);

  // 2. Import functions
  const { newInspecao, saveRascunho, saveToHistorico, deleteFromHistorico, loadHistorico } = require("./storage");

  // Test 1: Sequence
  const i1 = newInspecao();
  console.assert(i1.numero === 1, "First inspection should be #001");
  saveToHistorico(i1);

  const i2 = newInspecao();
  console.assert(i2.numero === 2, "Second inspection should be #002");
  saveToHistorico(i2);

  // Test 2: Delete and Reuse
  deleteFromHistorico(i1.id);
  const listAfterDelete = loadHistorico();
  console.assert(listAfterDelete.length === 1, "Should have 1 inspection after delete");

  const i3 = newInspecao();
  console.assert(i3.numero === 1, "Third inspection should reuse #001");
  saveToHistorico(i3);

  // Test 3: Data integrity (The crash likely happens here)
  const i4 = newInspecao();
  // Simulate corrupt data (missing 'dados')
  const corrupt: any = { id: i4.id, numero: i4.numero, status: 'em_andamento' };
  localStorage.setItem(HISTORICO_KEY, JSON.stringify([corrupt, ...loadHistorico()]));
  
  try {
    const list = loadHistorico();
    console.log("Loaded history with corrupt data successfully");
    // This part would crash in UI if not handled
    list.forEach((item: any) => {
        const name = item.estabelecimento || (item.dados?.estabelecimento?.nomeFantasia) || "Sem nome";
        console.log(`Checking item ${item.numero}: ${name}`);
    });
  } catch (e) {
    console.error("Failed to handle corrupt data in loadHistorico", e);
  }

  console.log("Storage Tests Completed.");
}

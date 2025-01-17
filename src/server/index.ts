import express from 'express';

const app = express();
const port = 3001;  // Porta do servidor, pode escolher outra se necessário

// Rota simples para testar o servidor
app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

// Iniciando o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

// pages/api/scrape.js
import puppeteer from 'puppeteer';
import axios from 'axios';

export default async function handler(req, res) {
  try {
    // Função para obter a hora atual da API
    const getCurrentTime = async () => {
      const response = await axios.get('https://brasilapi.vercel.app/api/hora');
      if (response.status === 200) {
        return response.data.hora; // Retorna a hora no formato HH:MM:SS
      }
      return null;
    };

    // Obtém a hora atual
    const current_time = await getCurrentTime();

    if (!current_time) {
      return res.status(500).json({ message: "Não foi possível obter a hora da API." });
    }

    const currentHour = new Date(`1970-01-01T${current_time}Z`).getTime();

    // Configura o Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://www.tipminer.com/historico/betfair/aviator');

    let checkResults = new Set();

    while (true) {
      await page.waitForTimeout(2000); // Espera o conteúdo carregar

      const html = await page.content();
      const result_elements = await page.$$eval('.cell__result', els => els.map(el => el.innerText.trim()));
      const date_elements = await page.$$eval('.cell__date', els => els.map(el => el.innerText.trim()));

      const combined = result_elements.map((result, index) => ({
        result,
        date: date_elements[index],
      }));

      for (let { result, date } of combined) {
        const latestDateTime = new Date(`1970-01-01T${date}Z`).getTime();

        if (latestDateTime >= currentHour && !checkResults.has(result)) {
          checkResults.add(result);
          console.log(`R: ${result}, Data: ${date}`);
        }
      }

      // Verifique se precisa sair do loop ou ajustar a lógica conforme necessário
      // Por exemplo, adicionar condição de saída do loop para testes:
      // if (checkResults.size > 5) break;
    }

    await browser.close();

    res.status(200).json({ message: "Finalizado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao processar a requisição." });
  }
}

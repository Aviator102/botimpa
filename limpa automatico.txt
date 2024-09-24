from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import time
import mysql.connector
from mysql.connector import Error
import tkinter as tk
from tkinter import messagebox
import threading

# Função para conectar ao banco de dados MySQL
def conectar_bd():
    try:
        connection = mysql.connector.connect(
            host='db4free.net',
            user='ssonhador',
            password='ssonhador',
            database='ssonhador',
            charset='utf8mb4'  # Adicionando o charset para suporte a caracteres Unicode
        )
        if connection.is_connected():
            print("Conexão com o MySQL estabelecida com sucesso.")
            return connection
    except Error as err:
        print(f"Erro ao conectar ao MySQL: {err}")
        return None

# Função para inserir resultado no banco de dados
def inserir_resultado(valor, hora):
    connection = conectar_bd()
    if connection:
        try:
            cursor = connection.cursor()
            query = "INSERT INTO resultados (valor, hora) VALUES (%s, %s)"
            cursor.execute(query, (valor, hora))
            connection.commit()
            print("Resultado inserido com sucesso!")
        except Error as err:
            print(f"Erro ao inserir no MySQL: {err}")
        finally:
            cursor.close()
            connection.close()

# Função para limpar o banco de dados
def limpar_banco():
    connection = conectar_bd()
    if connection:
        try:
            cursor = connection.cursor()
            query = "DELETE FROM resultados"
            cursor.execute(query)
            connection.commit()
            messagebox.showinfo("Limpeza", "Banco de dados limpo com sucesso!")
            print("Banco de dados limpo com sucesso!")
        except Error as err:
            messagebox.showerror("Erro", f"Erro ao limpar o banco de dados: {err}")
            print(f"Erro ao limpar o banco de dados: {err}")
        finally:
            cursor.close()
            connection.close()

# Função para criar a interface gráfica
def criar_interface():
    janela_gui = tk.Tk()
    janela_gui.title("Gerenciamento do Banco de Dados")
    janela_gui.geometry("300x150")
    
    # Botão para limpar o banco de dados
    botao_limpar = tk.Button(janela_gui, text="Limpar Banco de Dados", command=limpar_banco)
    botao_limpar.pack(pady=20)

    janela_gui.mainloop()

# Função para definir a cor do texto baseado no valor
def definir_cor_texto(valor):
    try:
        valor_float = float(valor)
        if 1 <= valor_float <= 1.99:
            return "#ADD8E6"  # Azul claro
        elif 2 <= valor_float <= 9.99:
            return "#8A2BE2"  # Roxo
        elif valor_float >= 10:
            return "#FF1493"  # Rosa choque
    except ValueError:
        return "#FFFFFF"  # Branco para valores inválidos

# Função principal para capturar os resultados
def api():
    global resultados
    driver.switch_to.window(janela)

    while len(driver.find_elements(By.XPATH, '/html/body/app-root/app-out-component/div[1]/main/app-games/app-casino-details/div/div/div/div/div[2]/iframe')) == 0:
        time.sleep(2)

    iframe1 = driver.find_element(By.XPATH, '/html/body/app-root/app-out-component/div[1]/main/app-games/app-casino-details/div/div/div/div/div[2]/iframe')
    driver.switch_to.frame(iframe1)

    while len(driver.find_elements(By.XPATH, '/html/body/app-root/app-game/div/div[1]/div[2]/div/div[2]/div[1]')) == 0:
        time.sleep(2)

    novos_resultados = driver.find_element(By.XPATH, '/html/body/app-root/app-game/div/div[1]/div[2]/div/div[2]/div[1]').text.split()[0:10]
    novos_resultados = [r.replace('x', '') for r in novos_resultados]

    # Retorna apenas os resultados novos, ignorando os já exibidos
    novos_resultados = [r for r in novos_resultados if r not in resultados]
    resultados.extend(novos_resultados)  # Adiciona os novos resultados à lista principal

    return novos_resultados

# Função para o loop de captura e inserção de resultados no banco de dados
def loop():
    novos_resultados = api()

    if novos_resultados:
        for resultado in novos_resultados:
            print(f"Resultado: {resultado} | Hora: {datetime.now().strftime('%H:%M:%S')}")
            # Insere o resultado no banco de dados
            inserir_resultado(resultado, datetime.now().strftime('%H:%M:%S'))

    time.sleep(1)  # Aguarda 1 segundo antes de buscar novos resultados

# Função para executar a limpeza do banco de dados periodicamente
def limpar_banco_periodicamente(intervalo):
    while True:
        limpar_banco()
        time.sleep(intervalo)

# Configurando o Selenium para rodar no modo headless
chrome_options = Options()
chrome_options.add_argument("--headless")  # Executa o navegador no modo "headless"
chrome_options.add_argument("--disable-gpu")  # Necessário no Windows para evitar bugs gráficos

# Inicializa o driver do Selenium no modo headless
driver = webdriver.Chrome(options=chrome_options)
driver.get('https://m.vaidebet.com/ptb/games/casino/detail/normal/7787')

# Espera o carregamento da página
time.sleep(3)

# Preenche os campos de login
username_field = driver.find_element(By.ID, 'username')
username_field.send_keys('joseAviatorr')

password_field = driver.find_element(By.ID, 'password')
password_field.send_keys('Aviator102030!')

# Clica no botão de login
login_button = driver.find_element(By.CSS_SELECTOR, 'button.btn.login-btn')
login_button.click()

# Espera o carregamento da página após o login
time.sleep(5)  # Aguarda 5 segundos para garantir que a página pós-login seja carregada

# Minimiza a janela do navegador
driver.minimize_window()

janela = driver.window_handles[0]
resultados = []  # Lista de resultados, começando vazia

# Inicia a interface gráfica em uma thread separada
interface_thread = threading.Thread(target=criar_interface)
interface_thread.start()

# Inicia o loop de captura e atualização dos resultados
while True:
    loop()

# Inicia a limpeza periódica do banco de dados (a cada 1 hora = 3600 segundos)
limpeza_thread = threading.Thread(target=limpar_banco_periodicamente, args=(3600,))
limpeza_thread.start()

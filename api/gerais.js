import axios from 'axios'
import {prettyNum} from 'pretty-num'
import { rastrearEncomendas } from 'correios-brasil'
import translate from '@vitalets/google-translate-api'
import google from '@victorsouzaleal/googlethis'
import Genius from 'genius-lyrics'
import qs from 'querystring'
import { timestampParaData } from '../lib/util.js'
import {obterDadosBrasileiraoA, obterDadosBrasileiraoB} from '@victorsouzaleal/brasileirao'
import {JSDOM} from 'jsdom'
import UserAgent from 'user-agents'


export const obterAnimesLancamento = async()=>{
    return new Promise(async(resolve, reject) =>{
        try{
            const URL_BASE = 'https://www.hinatasoul.com'
            const {data} = await axios.get(URL_BASE, {headers: {"User-Agent": new UserAgent().toString()}})
            const {window:{document}} = new JSDOM(data)
            const $animes = document.querySelectorAll('div.mainContainer.mwidth > div:nth-child(6) > div.ultimosEpisodiosHomeItem')
            let animes = []
            $animes.forEach($anime =>{
                animes.push({
                    nome: $anime.querySelector('a').getAttribute('title').trim(),
                    episodio: $anime.querySelector('div.ultimosEpisodiosHomeItemInfosNum').innerHTML.replace(/(\r\n\t|\n|\r|\t)/gm, ""),
                    link: $anime.querySelector('a').href
                })
            })
            resolve({resultado: animes})
        } catch(err){
            reject({erro: 'Houve um erro no servidor para obter os lançamentos de animes.'})
        }
    })
}

export const obterDadosBrasileirao = async(serie = "A")=>{
    return new Promise(async(resolve,reject)=>{
        try{
            let resposta = {sucesso: false}
            if(serie === "A"){
                const dadosBrasileiraoA = await obterDadosBrasileiraoA()
                resposta = {
                    sucesso: true,
                    resultado: {
                        tabela: dadosBrasileiraoA.tabela,
                        rodada_atual: dadosBrasileiraoA.rodadas.filter(rodada => rodada.rodada_atual == true),
                        rodadas: dadosBrasileiraoA.rodadas  
                    }
                }
                resolve(resposta)
            } else if (serie === "B"){
                const dadosBrasileiraoB = await obterDadosBrasileiraoB()
                resposta = {
                    sucesso: true,
                    resultado: {
                        tabela: dadosBrasileiraoB.tabela,
                        rodada_atual: dadosBrasileiraoB.rodadas.filter(rodada => rodada.rodada_atual == true),
                        rodadas: dadosBrasileiraoB.rodadas  
                    }
                }
                resolve(resposta)
            } else {
                resposta = {sucesso: false, erro: "A série inserida não é suportada, apenas A e B."}
                reject(resposta)
            }
        } catch(err){
            console.log(`API obterDadosBrasileirao - ${err.message}`)
            reject({sucesso: false, erro: `Houve um erro ao obter os dados da tabela do Brasileirão no servidor.`})
        }
    })
}

export const top20TendenciasDia = async(tipo = 'filmes')=>{
    return new Promise(async(resolve,reject)=>{
        try{
            let resposta = {sucesso: false}
            let num = 0
            switch(tipo){
                case "filmes":
                    tipo = "movie"
                    break
                case "series":
                    tipo = "tv"
                    break
            }
            await axios.get(`https://api.themoviedb.org/3/trending/${tipo}/day?api_key=6618ac868ff51ffa77d586ee89223f49&language=pt-BR`)
            .then(({data})=>{
                const dados = data.results.map((item)=>{
                    num++;
                    return `${num}°: *${item.title || item.name}.*\n\`Sinopse:\` ${item.overview} \n`
                    }).join('\n');
                resposta = {sucesso: true, resultado: dados}
                resolve(resposta)
            }).catch(() =>{
                resposta = {sucesso: false, erro: `Houve um erro no servidor ao listar ${tipo === 'movie' ? "os filmes":tipo === 'tv' && "as séries"}.`}
                reject(resposta)
            })
        } catch(err){
            console.log(`API top20TendenciasDia- ${err.message}`)
            reject({sucesso: false, erro: `Houve um erro no servidor ao listar ${tipo === 'movie' ? "os filmes":tipo === 'tv' && "as séries"}.`})
        }
    })
}

export const obterCalculo = async (expressao) =>{
    return new Promise (async (resolve, reject)=>{
        try{
            let resposta = {sucesso: true}
            expressao = expressao.replace(/[Xx\xD7]/g, "*")
            expressao = expressao.replace(/\xF7/g, "/")
            expressao = expressao.replace(/,/g,".")
            expressao = expressao.replace("em","in")
            await axios.post(`https://api.mathjs.org/v4/`,{expr: expressao}).then((res)=>{
                let resultado = res.data.result
                if(resultado == "NaN" || resultado == "Infinity"){
                    resposta = {sucesso: false, erro: 'Foi feita uma divisão por 0 ou algum outro cálculo inválido.'}
                    reject(resposta)
                }
                resultado = resultado.split(" ")
                resultado[0] = (resultado[0].includes("e")) ? prettyNum(resultado[0]) : resultado[0]
                resposta = {sucesso: true, resultado: resultado.join(" ")}
                resolve(resposta)
            }).catch(()=>{
                resposta = {sucesso: false, erro: 'Houve um erro no servidor de cálculo.'}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterCalculo- ${err.message}`)
            reject({sucesso: false, erro: 'Houve um erro no servidor de cálculo.'})
        }
    })
}

export const obterNoticias = async ()=>{
    return new Promise(async(resolve,reject)=>{
        try {
            let resposta = {sucesso:false}
            await google.getTopNews('pt').then((listaNoticias)=>{
                resposta = {sucesso:true, resultado : []}
                for(let noticia of listaNoticias.headline_stories){
                    resposta.resultado.push({
                        titulo : noticia.title,
                        publicadoHa : noticia.published,
                        autor: noticia.by,
                        url : noticia.url
                    })
                }
                resolve(resposta)
            }).catch(()=>{
                resposta = {sucesso:false, erro: "Houve um erro no servidor de notícias."}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterNoticias - ${err.message}`)
            reject({sucesso:false, erro: "Houve um erro no servidor de notícias."})
        }
    })
}

export const obterTraducao = async (texto, idioma)=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {sucesso: false}
            await translate(texto , {to: idioma}).then((res)=>{
                resposta = {sucesso: true, resultado: res.text}
                resolve(resposta)
            }).catch(()=>{
                resposta = {sucesso: false, erro: "Houve um erro em processar a tradução."}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterTraducao - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro em processar a tradução."})
        }
    })
}


export const encurtarLink = async(link)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            await axios.post("https://shorter.me/page/shorten", qs.stringify({url : link, alias: '', password: ''})).then(({data})=>{
                if(!data.data){
                    resposta = {sucesso: false, erro: `O link que você inseriu é inválido.`}
                    reject(resposta)
                } else {
                    resposta = {sucesso: true, resultado: data.data}
                    resolve(resposta)
                }
            }).catch(err =>{
                resposta = {sucesso: false, erro: `Houve um erro no servidor do encurtador de link.`}
                reject(resposta)
            })
        } catch(err){
            console.log(`API encurtarLink - ${err.message}`)
            reject({sucesso: false, erro: `Houve um erro no servidor do encurtador de link`})
        }
    })
}

export const obterRastreioCorreios = async (codigoRastreio) =>{
    return new Promise(async (resolve,reject)=>{
        try{
            let resposta = {sucesso: false}
            await rastrearEncomendas([codigoRastreio]).then((res)=>{
                if(res[0].length < 1){
                    resposta = {sucesso: false, erro: 'Parece que este objeto ainda não foi postado ou não existe'}
                    reject(resposta)
                } else {
                    resposta = {sucesso: true, resultado: res[0]}
                    resolve(resposta)
                }
            })
        } catch(err){
            console.log(`API obterRastreioCorreios - ${err.message}`)
            reject({sucesso: true, erro: "Houve um erro no servidor dos Correios."})
        }  
    })
}

export const obterPesquisaWeb = async (texto) =>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: true, resultados:[]}
            const options = {
                page: 0, 
                safe: false, // Safe Search
                parse_ads: false, // If set to true sponsored results will be parsed
                additional_params: { 
                    hl: 'pt-br' 
                }
            }
            await google.search(texto, options).then((resultados)=>{
                if(resultados.results.length == 0){
                    resposta = {sucesso: false, erro:" Não foram encontrados resultados para esta pesquisa."}
                    reject(resposta)
                } else {
                    resposta.sucesso = true
                    for(let resultado of resultados.results){
                        resposta.resultados.push({
                            titulo: resultado.title,
                            link: resultado.url,
                            descricao : resultado.description
                        })
                    }
                    resolve(resposta)
                }
            }).catch(()=>{
                resposta = {sucesso: false, erro: "Houve um erro no servidor de pesquisa."}
                reject(resposta)
            })
        } catch(err) {
            console.log(`API obterPesquisaWeb - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro no servidor de pesquisa."})
        }
    })
}

export const obterClima = async (local) =>{
    return new Promise(async (resolve, reject)=>{
        try{
            let resposta = {sucesso: false}
            const climaAPIURL = `http://api.weatherapi.com/v1/forecast.json?key=516f58a20b6c4ad3986123104242805&q=${encodeURIComponent(local)}&days=3&aqi=no&alerts=no`
            await axios.get(climaAPIURL).then(async ({data})=>{
                const {data: condicoesClima} = await axios.get("https://www.weatherapi.com/docs/conditions.json", {responseType: 'json'})
                const condicaoAtual = (condicoesClima.find((condicao)=> condicao.code == data.current.condition.code)).languages.find((idioma) => idioma.lang_iso == 'pt')
                let clima = {
                    local: {
                        nome: data.location.name,
                        estado: data.location.region,
                        pais: data.location.country,
                        horario_atual: timestampParaData(data.location.localtime_epoch * 1000)
                    },
                    atual: {
                        ultima_atualizacao: timestampParaData(data.current.last_updated_epoch * 1000),
                        temp: `${data.current.temp_c} C°`,
                        sensacao: `${data.current.feelslike_c} C°`,
                        condicao: data.current.is_day ? condicaoAtual.day_text : condicaoAtual.night_text,
                        vento: `${data.current.wind_kph} Km/h`,
                        umidade: `${data.current.humidity} %`,
                        nuvens: `${data.current.cloud} %`
                    },
                    previsao: []
                }

                data.forecast.forecastday.forEach((previsao)=>{
                    const condicaoDia = (condicoesClima.find((condicao)=> condicao.code == previsao.day.condition.code)).languages.find((idioma) => idioma.lang_iso == 'pt')
                    const [ano, mes, dia] = previsao.date.split("-")
                    const dadosPrevisao = {
                        data : `${dia}/${mes}/${ano}`,
                        max: `${previsao.day.maxtemp_c} C°`,
                        min: `${previsao.day.mintemp_c} C°`,
                        media: `${previsao.day.avgtemp_c} C°`,
                        condicao: `${condicaoDia.day_text}`,
                        max_vento: `${previsao.day.maxwind_kph} Km/h`,
                        chuva : `${previsao.day.daily_will_it_rain ? "Sim" : "Não"}`,
                        chance_chuva : `${previsao.day.daily_chance_of_rain} %`,
                        neve: `${previsao.day.daily_will_it_snow ? "Sim" : "Não"}`,
                        chance_neve : `${previsao.day.daily_chance_of_snow} %`,
                        uv: previsao.day.uv
                    }
                    clima.previsao.push(dadosPrevisao)
                })

                resposta = {sucesso: true, resultado: clima}
                resolve(resposta)
            }).catch(()=>{
                resposta = {sucesso: false, erro: "Houve um erro no servidor de pesquisa de clima."}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterClima - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro no servidor de pesquisa de clima."})
        }
    })
}

export const obterLetraMusica = async (texto) =>{
    return new Promise(async (resolve,reject)=>{
        try{
            let resposta = {sucesso: false}
            const Client = new Genius.Client()
            await Client.songs.search(texto).then(async (pesquisaMusica)=>{
                if(pesquisaMusica.length == 0) {
                    resposta = {sucesso: false, erro: "A letra da música não foi encontrada"}
                    reject(resposta)
                } else {
                    let letraMusica = await pesquisaMusica[0].lyrics()
                    resposta = {sucesso:true, resultado: {
                        titulo: pesquisaMusica[0].title,
                        artista: pesquisaMusica[0].artist.name,
                        imagem : pesquisaMusica[0].artist.image,
                        letra: letraMusica
                    }}
                    resolve(resposta)
                }
            }).catch((err)=>{
                if(err.message == "No result was found"){
                    resposta = {sucesso: false, erro: "A letra da música não foi encontrada"}
                    reject(resposta)
                } else {
                    resposta = {sucesso: false, erro: "Houve um erro no servidor para obter a letra da música."}
                    reject(resposta)
                    throw err
                }
            })
        } catch(err){
            console.log(`API obterLetraMusica - ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro no servidor para obter a letra da música."})
        }
    })
}

export const obterConversaoMoeda = async (moeda, valor)=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {sucesso: false}
            const moedasSuportadas = ['dolar','euro', 'real']
            moeda = moeda.toLowerCase()
            valor = valor.toString().replace(",",".")

            if(!moedasSuportadas.includes(moeda)){
                resposta = {sucesso: false, erro: 'Moeda não suportada, atualmente existe suporte para : real|dolar|euro'}
                reject(resposta)
            }
            if(isNaN(valor)){
                resposta = {sucesso: false, erro: 'O valor não é um número válido'}
                reject(resposta)
            } 
            if(valor > 1000000000000000){
                resposta = {sucesso: false, erro: 'Quantidade muito alta, você provavelmente não tem todo esse dinheiro.'}
                reject(resposta)
            } 

            let params = ''
            switch(moeda){
                case 'dolar':
                    moeda = (valor > 1) ? "Dólares" : "Dólar"
                    params = "USD-BRL,USD-EUR,USD-JPY"
                    break
                case 'euro':
                    moeda = (valor > 1) ? "Euros" : "Euro"
                    params = "EUR-BRL,EUR-USD,EUR-JPY"
                    break
                case 'iene':
                    moeda = (valor > 1) ? "Ienes" : "Iene"
                    params= "JPY-BRL,JPY-USD,JPY-EUR"
                    break 
                case 'real':
                    moeda = (valor > 1) ? "Reais" : "Real"
                    params= "BRL-USD,BRL-EUR,BRL-JPY"
                    break                  
            }
            await axios.get(`https://economia.awesomeapi.com.br/json/last/${params}`).then(({data})=>{
                resposta = {
                    sucesso: true,
                    resultado : {
                        valor_inserido : valor,
                        moeda_inserida: moeda,
                        conversao : []
                    }
                }
                for (let conversao in data){
                    let nomeMoeda = '', tipoMoeda = '', simbolo = ''
                    switch(data[conversao].codein){
                        case "BRL":
                            tipoMoeda = "Real/Reais"
                            nomeMoeda = "real"
                            simbolo = "R$"
                            break
                        case "EUR":
                            tipoMoeda = "Euro/Euros"
                            nomeMoeda = "euro"
                            simbolo = "Є"
                            break
                        case "USD":
                            tipoMoeda = "Dólar/Dólares"
                            nomeMoeda = "dolar"
                            simbolo = "$"
                            break
                        case "JPY":
                            tipoMoeda = "Iene/Ienes"
                            nomeMoeda = 'iene'
                            simbolo = "¥"
                            break
                    }
                    let dataHoraAtualizacao = data[conversao].create_date.split(" ")
                    let dataAtualizacao = dataHoraAtualizacao[0].split("-"), horaAtualizacao = dataHoraAtualizacao[1]
                    resposta.resultado.conversao.push({
                        tipo: tipoMoeda,
                        conversao : data[conversao].name,
                        valor_convertido : (data[conversao].bid * valor).toFixed(2),
                        valor_convertido_formatado : `${simbolo} ${(data[conversao].bid * valor).toFixed(2)}`,
                        atualizacao: `${dataAtualizacao[2]}/${dataAtualizacao[1]}/${dataAtualizacao[0]} às ${horaAtualizacao}`
                    })
                    resolve(resposta)
                }
            }).catch(()=>{
                resposta = {sucesso: false, erro: 'Houve um erro no servidor de conversão de moedas'}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterConversaoMoeda - ${err.message}`)
            reject({sucesso: false, erro: 'Houve um erro no servidor de conversão de moedas'})
        }
    })
}

export const obterCartasContraHu = async()=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {sucesso: false}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/bfbafb665a35436acc2310d51d754abb/raw/df5eee4e8abedbf1a18f031873d33f1e34ac338a/cartas.json").then(async (github_gist_cartas)=>{
                let cartas = github_gist_cartas.data, cartaPretaAleatoria = Math.floor(Math.random() * cartas.cartas_pretas.length), cartaPretaEscolhida = cartas.cartas_pretas[cartaPretaAleatoria], cont_params = 1
                if(cartaPretaEscolhida.indexOf("{p3}" != -1)) cont_params = 3
                else if(cartaPretaEscolhida.indexOf("{p2}" != -1)) cont_params = 2
                else cont_params = 1
                for(let i = 1; i <= cont_params; i++){
                    let cartaBrancaAleatoria = Math.floor(Math.random() * cartas.cartas_brancas.length)
                    let cartaBrancaEscolhida = cartas.cartas_brancas[cartaBrancaAleatoria]
                    cartaPretaEscolhida = cartaPretaEscolhida.replace(`{p${i}}`, `*${cartaBrancaEscolhida}*`)
                    cartas.cartas_brancas.splice(cartas.cartas_brancas.indexOf(cartaBrancaEscolhida, 1))
                }
                resposta = {sucesso: true, resultado: cartaPretaEscolhida}
                resolve(resposta)
            }).catch(()=>{
                resposta = {sucesso: false, erro: "Houve um erro no servidor para obter as cartas."}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterCartasContraHu- ${err.message}`)
            reject({sucesso: false, erro: "Houve um erro no servidor para obter as cartas."})
        }
    })

}

export const obterInfoDDD = async(DDD)=>{
    return new Promise(async (resolve, reject)=>{
        try {
            let resposta = {sucesso: false}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/ea89a42a9f912c988bbc12c1f3c2d110/raw/af37319b023503be780bb1b6a02c92bcba9e50cc/ddd.json").then(async githubGistDDD=>{
                let estados = githubGistDDD.data.estados
                let indexDDD = estados.findIndex(estado => estado.ddd.includes(DDD))
                if(indexDDD != -1){
                    resposta = {sucesso:true, resultado: {estado: estados[indexDDD].nome, regiao: estados[indexDDD].regiao}}
                    resolve(resposta)
                } else {
                    resposta = {sucesso: false, erro: 'Este DDD não foi encontrado, certifique-se que ele é válido.'}
                    reject(resposta)
                }
            }).catch(()=>{
                resposta = {sucesso: false, erro: 'Houve um erro para obter dados sobre este DDD, tente novamente mais tarde.'}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterInfoDDD - ${err.message}`)
            reject({sucesso: false, erro: 'Houve um erro para obter dados sobre este DDD, tente novamente mais tarde.'})
        }
    })
}

export const obterTabelaNick = async()=>{
    return new Promise(async(resolve,reject)=>{
        try{
            let resposta = {sucesso: false}
            await axios.get("https://gist.githubusercontent.com/victorsouzaleal/9a58a572233167587e11683aa3544c8a/raw/aea5d03d251359b61771ec87cb513360d9721b8b/tabela.txt").then((githubGistTabela)=>{
                resposta = {sucesso: true, resultado: githubGistTabela.data}
                resolve(resposta)
            }).catch(()=>{
                resposta = {sucesso: false, erro: 'Houve um erro para obter os dados, tente novamente mais tarde.'}
                reject(resposta)
            })
        } catch(err){
            console.log(`API obterTabelaNick - ${err.message}`)
            reject({sucesso: false, erro: 'Houve um erro para obter os dados, tente novamente mais tarde.'})
        }
    })
}




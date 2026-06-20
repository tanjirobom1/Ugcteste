const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1517751731453165701/qZER6rreBeRDR_jsxs0qPuhRd5qiL20xi-2YSl6cKomKoZuzhNcwafVzRVN-RIiDh6tT";

interface LocationData {
  ip: string;
  country_name: string;
  country_code: string;
  city?: string;
  region?: string;
}

async function getLocationData(): Promise<LocationData | null> {
  const apiEndpoints = [
    {
      url: "https://ipapi.co/json/",
      parser: (data: any) => ({
        ip: data.ip,
        country_name: data.country_name,
        country_code: data.country_code,
        city: data.city,
        region: data.region
      })
    },
    {
      url: "https://ip-api.com/json/",
      parser: (data: any) => ({
        ip: data.query,
        country_name: data.country,
        country_code: data.countryCode,
        city: data.city,
        region: data.regionName
      })
    },
    {
      url: "https://ipwho.is/",
      parser: (data: any) => ({
        ip: data.ip,
        country_name: data.country,
        country_code: data.country_code,
        city: data.city,
        region: data.region
      })
    }
  ];

  for (const endpoint of apiEndpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = endpoint.parser(data);
        
        if (parsed.ip && parsed.country_name) {
          return {
            ip: parsed.ip || "Desconhecido",
            country_name: parsed.country_name || "Desconhecido",
            country_code: parsed.country_code || "",
            city: parsed.city,
            region: parsed.region
          };
        }
      }
    } catch (error) {
      console.warn(`Erro ao conectar com ${endpoint.url}:`, error);
      continue;
    }
  }

  return {
    ip: "Desconhecido",
    country_name: "Desconhecido",
    country_code: "",
    city: undefined,
    region: undefined
  };
}

function getDeviceInfo(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.length > 256) {
    return userAgent.substring(0, 253) + "...";
  }
  return userAgent || "Desconhecido";
}

function countryCodeToFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return "";
  }
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return "";
  }
}

export async function sendDiscordLog(eventType: "visit" | "group_click"): Promise<boolean> {
  try {
    const locationData = await getLocationData();
    const deviceInfo = getDeviceInfo();
    const timestamp = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });

    if (!locationData) {
      console.warn("Não foi possível obter dados de localização");
      return false;
    }

    const countryFlag = countryCodeToFlag(locationData.country_code);
    const countryDisplay = `${locationData.country_name} ${countryFlag}`.trim();

    const payload = {
      embeds: [
        {
          title: eventType === "visit" 
            ? "🚀 Novo Visitante no Site" 
            : "🔗 Clique no Grupo Roblox",
          description: eventType === "visit"
            ? "Alguém entrou no site BestUGCs"
            : "Alguém clicou para entrar no grupo Roblox",
          color: eventType === "visit" ? 0x00ff00 : 0xff0000,
          fields: [
            {
              name: "🌐 Endereço IP",
              value: locationData.ip,
              inline: true
            },
            {
              name: "🚩 País",
              value: countryDisplay,
              inline: true
            },
            {
              name: "📱 Modelo do Aparelho",
              value: `\`\`\`${deviceInfo}\`\`\``,
              inline: false
            },
            {
              name: "🕒 Horário (São Paulo)",
              value: timestamp,
              inline: true
            },
            {
              name: "📍 Localização",
              value: locationData.city && locationData.region
                ? `${locationData.city}, ${locationData.region}`
                : "Não disponível",
              inline: true
            }
          ],
          footer: {
            text: "BestUGCs Logger • Sistema de Monitoramento",
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Erro ao enviar log para Discord: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao enviar log para Discord:", error);
    return false;
  }
}

export function initializeLogger(): void {
  sendDiscordLog("visit").catch(error => {
    console.error("Erro ao inicializar logger:", error);
  });
}

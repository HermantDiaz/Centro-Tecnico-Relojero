"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface EmpresaConfig {
  id: string;
  nombre_empresa: string;
  eslogan: string;
  direccion_telefono: string;
  mensaje_despedida: string;
  moneda_principal: string;
}

const defaultConfig: EmpresaConfig = {
  id: 'default',
  nombre_empresa: 'RELOJERIA IA',
  eslogan: 'CTR Relojeria Software System',
  direccion_telefono: 'Nicaragua - Gestión Financiera Centralizada',
  mensaje_despedida: '¡Gracias por confiar en CTR Relojeria!',
  moneda_principal: 'C$'
};

interface SettingsContextType {
  empresa: EmpresaConfig;
  formatCurrency: (amount: number) => string;
  refreshConfig: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  empresa: defaultConfig,
  formatCurrency: (amount: number) => `C$ ${amount.toFixed(2)}`,
  refreshConfig: async () => {},
  loading: true,
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [empresa, setEmpresa] = useState<EmpresaConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('empresa_config')
        .select('*')
        .eq('id', 'default')
        .single();
        
      if (!error && data) {
        setEmpresa(data);
      }
    } catch (e) {
      console.error("Error cargando config de empresa", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();

    // Suscripción Realtime para la configuración de la empresa
    const channel = supabase.channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'empresa_config'
        },
        (payload) => {
          if (payload.new && (payload.new as EmpresaConfig).id === 'default') {
            setEmpresa(payload.new as EmpresaConfig);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return `${empresa.moneda_principal} ${amount.toFixed(2)}`;
  };

  return (
    <SettingsContext.Provider value={{ empresa, formatCurrency, refreshConfig: fetchConfig, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

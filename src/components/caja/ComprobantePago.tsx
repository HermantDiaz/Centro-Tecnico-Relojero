"use client";

import React, { useRef } from 'react';
import { Printer, Download, Share2, X } from 'lucide-react';
import Image from 'next/image';
import { useSettings } from '@/hooks/useSettings';

interface ComprobanteProps {
  data: {
    numero_recibo: string;
    cliente_nombre: string;
    monto: number;
    metodo_pago: string;
    concepto: string;
    fecha: string;
    atendido_por: string;
    subtotal?: number;
    descuento?: number;
    detalles?: {
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      subtotal: number;
    }[];
  };
  onClose: () => void;
}

export default function ComprobantePago({ data, onClose }: ComprobanteProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { empresa, formatCurrency } = useSettings();

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante de Pago - Centro Técnico Relojero</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #000; }
            /* Default styles for raw HTML if tailwind is not loaded in print window */
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #ccc; padding-bottom: 10px; }
            .header div { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
            .header p { font-size: 10px; color: #666; margin: 2px 0; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
            .label { font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; }
            .value { font-size: 12px; font-weight: bold; }
            .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; font-size: 10px; }
            .details-table th { text-align: left; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .details-table td { padding: 5px 0; border-bottom: 1px dashed #eee; }
            .total-row { display: flex; justify-content: space-between; font-size: 10px; margin-top: 5px; }
            .total-box { margin-top: 15px; padding: 15px; background: #000; color: #fff; text-align: center; border-radius: 8px; }
            .total-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; }
            .total-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
            .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div style="max-width: 400px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <div class="header">
                  <div>${empresa.nombre_empresa}</div>
                  <p>${empresa.eslogan}</p>
                  <p>${empresa.direccion_telefono}</p>
              </div>
              
              <div class="row"><span class="label">Recibo No.</span><span class="value">#${data.numero_recibo}</span></div>
              <div class="row"><span class="label">Fecha</span><span class="value">${data.fecha}</span></div>
              <div class="row"><span class="label">Cliente</span><span class="value">${data.cliente_nombre.toUpperCase()}</span></div>
              
              ${data.detalles && data.detalles.length > 0 ? `
              <table class="details-table">
                <thead><tr><th>Cant</th><th>Concepto</th><th style="text-align:right">Total</th></tr></thead>
                <tbody>
                  ${data.detalles.map(d => `<tr><td>${d.cantidad}</td><td>${d.descripcion}</td><td style="text-align:right">$${d.subtotal.toFixed(2)}</td></tr>`).join('')}
                </tbody>
              </table>
              <div class="total-row"><span>Subtotal:</span><span>$${(data.subtotal || data.monto).toFixed(2)}</span></div>
              ${data.descuento && data.descuento > 0 ? `<div class="total-row" style="color: red;"><span>Descuento:</span><span>-$${data.descuento.toFixed(2)}</span></div>` : ''}
              ` : `
              <div style="margin-bottom: 15px;">
                  <span class="label" style="display:block; margin-bottom:3px;">Concepto</span>
                  <span class="value">${data.concepto}</span>
              </div>
              `}
              
              <div class="row"><span class="label">Método de Pago</span><span class="value" style="color: #d97706;">${data.metodo_pago}</span></div>

              <div class="total-box">
                  <div class="total-label">Total Entregado</div>
                  <div class="total-value">${formatCurrency(data.monto)}</div>
              </div>

              <div class="footer">
                  <p>${empresa.mensaje_despedida}</p>
                  <p>Atendido por: ${data.atendido_por}</p>
              </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      {/* Reduced max-width from max-w-xl to max-w-sm */}
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
           <h3 className="text-white text-[10px] font-black uppercase tracking-widest italic ml-2">Comprobante de Operación</h3>
           <button onClick={onClose} className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-400 transition-colors">
              <X className="w-4 h-4" />
           </button>
        </div>

        <div className="p-5">
            {/* Printable Area Wrapper for screen preview - scaled down */}
            <div ref={receiptRef} className="bg-white text-black p-6 rounded-2xl shadow-inner border-t-[6px] border-black">
                <div className="text-center mb-5 pb-4 border-b border-dashed border-neutral-200">
                    <div className="text-lg font-black uppercase tracking-[.2em] mb-1 italic">{empresa.nombre_empresa}</div>
                    <p className="text-[8px] uppercase font-bold text-neutral-400 tracking-widest">{empresa.eslogan}</p>
                    <p className="text-[7px] text-neutral-400 mt-1">{empresa.direccion_telefono}</p>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between border-b border-neutral-50 pb-1.5 break-words">
                        <span className="text-[8px] font-black uppercase text-neutral-400">Recibo No.</span>
                        <span className="text-xs font-black text-black">#{data.numero_recibo}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-50 pb-1.5 break-words">
                        <span className="text-[8px] font-black uppercase text-neutral-400">Fecha</span>
                        <span className="text-[10px] font-bold text-neutral-800">{data.fecha}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-50 pb-1.5 break-words">
                        <span className="text-[8px] font-black uppercase text-neutral-400">Cliente</span>
                        <span className="text-[10px] font-extrabold text-neutral-900">{data.cliente_nombre.toUpperCase()}</span>
                    </div>
                    {data.detalles && data.detalles.length > 0 ? (
                        <div className="py-2 border-b border-neutral-50 mb-2">
                            <span className="text-[8px] font-black uppercase text-neutral-400 block mb-2">Desglose de Artículos</span>
                            <div className="space-y-1">
                                {data.detalles.map((d, i) => (
                                    <div key={i} className="flex justify-between text-[9px] font-bold text-neutral-800">
                                        <span className="truncate pr-2 flex-1">{d.cantidad}x {d.descripcion}</span>
                                        <span className="shrink-0">${d.subtotal.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                            {(data.descuento || 0) > 0 && (
                                <div className="flex justify-between text-[9px] font-bold text-rose-500 mt-2 pt-2 border-t border-dashed border-neutral-100">
                                    <span>Descuento Aplicado</span>
                                    <span>-${data.descuento?.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-1.5">
                            <span className="text-[8px] font-black uppercase text-neutral-400 block mb-1">Concepto</span>
                            <span className="text-[10px] font-bold text-neutral-700 leading-tight">
                                {data.concepto.length > 50 ? data.concepto.substring(0,50) + '...' : data.concepto}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between border-b border-neutral-50 pb-1.5 mt-2">
                        <span className="text-[8px] font-black uppercase text-neutral-400">Método de Pago</span>
                        <span className="text-[10px] font-black text-amber-600 italic uppercase">{data.metodo_pago}</span>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-neutral-900 text-white rounded-xl text-center shadow-md">
                    <p className="text-[8px] font-black uppercase tracking-[.3em] opacity-40 mb-1">Total Entregado</p>
                    <p className="text-3xl font-black tracking-tighter">{formatCurrency(data.monto)}</p>
                </div>

                <div className="mt-6 text-center border-t border-neutral-100 pt-4">
                    <p className="text-[7px] font-black text-neutral-400 uppercase italic leading-loose">{empresa.mensaje_despedida}</p>
                    <p className="text-[7px] text-neutral-300 mt-0.5 uppercase tracking-widest font-bold">Atendido por: {data.atendido_por}</p>
                </div>
            </div>

            {/* Actions UI */}
            <div className="grid grid-cols-2 gap-3 mt-5">
                <button 
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 py-3 bg-white text-black rounded-[1rem] font-black text-[9px] uppercase tracking-widest hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
                >
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button 
                  className="flex items-center justify-center gap-2 py-3 bg-neutral-800 text-white rounded-[1rem] font-black text-[9px] uppercase tracking-widest border border-neutral-700 hover:bg-neutral-700 transition-all active:scale-95"
                  onClick={() => alert('Función de PDF próximamente disponible')}
                >
                    <Download className="w-3.5 h-3.5" /> PDF
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

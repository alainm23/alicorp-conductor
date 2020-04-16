import { Injectable } from '@angular/core';

// Utils
import { AngularFirestore } from '@angular/fire/firestore'
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';
import * as firebase from 'firebase/app'; 
import { first, map } from 'rxjs/operators';
import { combineLatest, of } from "rxjs";

import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  constructor (
    private afs: AngularFirestore
  ) { }

  // Carros
  get_carros () {
    return this.afs.collection ('Vehiculos').valueChanges ();
  }

  add_carga_gasolina (data: any) {
    return this.afs.collection ('Vehiculos').doc (data.vehiculo_id).collection ('Carga_Combustible').doc (data.id).set (data);
  }

  get_preferencias () {
    return this.afs.collection ('Preferencias').doc ('Preferencias_Conductor').valueChanges ();
  }

  // COnductores
  almuerzo_disponible (id: string, fecha: string) {
    return this.afs.collection ('Usuarios').doc (id).collection ('Almuerzos').doc (fecha).valueChanges ();
  }

  createId () {
    return this.afs.createId ();
  }

  async isUsuarioValid (uid: string) {
    return await this.afs.collection ('Usuarios').doc (uid).valueChanges ().pipe (first ()).toPromise ();
  }

  get_cardex_por_fechaconductor (usuario_id: string, fecha: string) {
    return this.afs.collection ('Cardex', ref => ref.where ('fecha', '==', fecha).where ('conductor_id', '==', usuario_id)).valueChanges ();
  }

  get_cardex_by_id (id: string) {
    return this.afs.collection ('Cardex').doc (id).valueChanges ();
  }

  get_clientes_by_cardex (id: string) {
    return this.afs.collection ('Cardex').doc (id).collection ('informacion_clientes', ref => ref.orderBy ('orden')).valueChanges ();
  }

  get_productos_by_cardex (id: string) {
    return this.afs.collection ('Cardex').doc (id).collection ('Productos').snapshotChanges().map (changes => {
      return changes.map(a => {
        const data = a.payload.doc.data();
        let checked = false;
        const id = a.payload.doc.id;
        return { id, checked, ...data };
      });
    });
  }

  update_cardex_ruta (item: any, value: string) {
    item [value] = firebase.firestore.FieldValue.serverTimestamp ();

    if (value === 'hora_inicio_carga') {
      item.estado = 'cargando';
    } else if (value === 'hora_fin_carga') {
      item.estado = 'fin_de_carga';
    } else if (value === 'hora_inicio_ruta') {
      item.estado = 'en_ruta';
    }

    return this.afs.collection ('Cardex').doc (item.id).update (item);
  }

  update_cardex (data: any) {
    if (data.estado === 'fin_ruta' || data.estado === 'camino_almacen') {
      data.hora_fin_ruta = firebase.firestore.FieldValue.serverTimestamp ();
      data.ultimo_cliente_hora = firebase.firestore.FieldValue.serverTimestamp ();
      data.cliente_actual = null;
    }

    return this.afs.collection ('Cardex').doc (data.id).update (data);
  }

  async update_cliente_cardex_ruta (item: any, cliente: any, value: string) {
    let batch = this.afs.firestore.batch ();
    if (item.cliente_actual !== null && item.cliente_actual !== undefined) {
      cliente [value] = firebase.firestore.FieldValue.serverTimestamp ();
    }

    if (value === 'hora_llegada') {
      if (item.cliente_actual !== null && item.cliente_actual !== undefined) {
        cliente.estado = 'llego';
      }

      item.estado = 'esperando_cliente';
    } else if (value === 'hora_inicio_descarga') {
      if (item.cliente_actual !== null && item.cliente_actual !== undefined) {
        cliente.estado = 'descargando';
      }

      item.estado = 'descargando';
    } else if (value === 'hora_fin_descarga') {
      if (item.cliente_actual !== null && item.cliente_actual !== undefined) {
        cliente.estado = 'finalizado';
      }
      
      item.estado = 'en_ruta';
    } else if (value === 'hora_llegada_almacen') {
      item [value] = firebase.firestore.FieldValue.serverTimestamp ();
      item.estado = 'fin_ruta';
    } else if (value === 'hora_fin_ruta') {
      item [value] = firebase.firestore.FieldValue.serverTimestamp ();
      item.estado = 'finalizado';
    } else if (value === 'hora_ausencia') {
      if (item.cliente_actual !== null && item.cliente_actual !== undefined) {
        // cliente.estado = 'ausente';
      }
    } else if (value === 'hora_rechazo_total') {
      if (item.cliente_actual !== null && item.cliente_actual !== undefined) {
        // cliente.estado = 'ausente';
      }
    }

    if (item.cliente_actual !== null && item.cliente_actual !== undefined) {
      batch.update (
        this.afs.collection ('Cardex').doc (item.id).collection ('informacion_clientes').doc (item.cliente_actual.id).ref,
        cliente
      );
    }

    batch.update (
      this.afs.collection ('Cardex').doc (item.id).ref,
      item
    );

    return await batch.commit ();
  }

  async update_cardex_cliente_productos (cardex_id: any, cliente_id: string, productos: any []) {
    let batch = this.afs.firestore.batch ();

    productos.forEach ((produto: any) => {
      let ref = this.afs.collection ('Cardex').doc (cardex_id).collection ('informacion_clientes').doc (cliente_id).collection ('Productos').doc (produto.id).ref;
      batch.update (
        ref,
        produto
      );
    });

    return await batch.commit ();
  }

  get_cliente_by_cardex (item: any, cliente_id: string) {
    return this.afs.collection ('Cardex').doc (item.id).collection ('informacion_clientes').doc (cliente_id).valueChanges ();
  }

  get_productos_by_cardex_cliente (cardex_id: string, cliente_id: string) {
    return this.afs.collection ('Cardex').doc (cardex_id).collection ('informacion_clientes').doc (cliente_id).collection ('Productos').valueChanges ();
  }

  // Eventos
  async add_cardex_event (item: any, evento: any) {
    let batch = this.afs.firestore.batch ();

    item.estado_pasado = item.estado;
    item.estado = evento.tipo;
    item.evento_actual = evento;

    batch.set (
      this.afs.collection ('Cardex').doc (item.id).collection ('Eventos').doc (evento.id).ref,
      evento
    );

    batch.update (
      this.afs.collection ('Cardex').doc (item.id).ref,
      item
    );

    return await batch.commit ();
  }

  async finalizar_evento_cardex (item: any, evento: any) {
    let batch = this.afs.firestore.batch ();

    item.estado = item.estado_pasado;
    item.estado_pasado = null;
    item.evento_actual = null;

    batch.update (
      this.afs.collection ('Cardex').doc (item.id).collection ('Eventos').doc (evento.id).ref,
      {
        hora_fin: moment().format('HH[:]mm')
      }
    );

    batch.update (
      this.afs.collection ('Cardex').doc (item.id).ref,
      item
    );

    if (evento.tipo === 'almuerzo') {
      batch.set (
        this.afs.collection ('Usuarios').doc (evento.conductor_id).collection ('Almuerzos').doc (moment ().format ('DD[-]MM[-]YYYY')).ref,
        {
          id: true
        }
      );
    }

    return await batch.commit ();
  }
}

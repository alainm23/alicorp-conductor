import { Component, OnInit, Input } from '@angular/core';

// Services
import { DatabaseService } from '../../services/database.service'
import { AlertController, ModalController, ActionSheetController, LoadingController, ToastController } from '@ionic/angular';
import * as moment from 'moment';
import { CallService } from '../../services/call.service';

// Utils
import { first } from 'rxjs/operators';

// Modal
import { AlertProductoPage } from '../../modals/alert-producto/alert-producto.page';

@Component({
  selector: 'app-checklist-producto-cliente',
  templateUrl: './checklist-producto-cliente.page.html',
  styleUrls: ['./checklist-producto-cliente.page.scss'],
})
export class ChecklistProductoClientePage implements OnInit {
  @Input() picking_id: string;
  @Input() cliente_id: string;

  items: any [] = [];
  cliente: any;
  cardex: any;

  constructor (
    private database: DatabaseService,
    private alertController: AlertController,
    private modalCtrl: ModalController,
    private actionSheetController: ActionSheetController,
    private loadingController: LoadingController,
    private phone_service: CallService,
    private toastController: ToastController
  ) { }

  call () {
    this.phone_service.llamar ();
  }

  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Obteniendo lista de productos...',
    });

    await loading.present ();

    this.cliente = await this.database.get_cliente_by_cardex ({id: this.picking_id}, this.cliente_id).pipe (first ()).toPromise ();
    this.items = await this.database.get_productos_by_cardex_cliente (this.picking_id, this.cliente_id).pipe (first ()).toPromise ();
    this.cardex = await this.database.get_cardex_by_id (this.picking_id).pipe (first ()).toPromise ();

    await loading.dismiss ();
  }

  async finalizar_descarga () {
    const alert = await this.alertController.create({
      header: 'Confirm!',
      message: 'Message <strong>text</strong>!!!',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {

          }
        }, {
          text: 'Okay',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Actualizando informacion...',
            });

            await loading.present ();

            this.items.forEach ((producto: any) => {
              if (producto.checked) {
                producto.estado = "entrega_completa";
              }

              if (producto.estado === 'rechazado_parcial') {
                this.cardex.numero_total_rechazos_parciales += 1;
              }

              if (producto.estado === 'rechazado_total') {
                this.cardex.numero_total_rechazos_totales += 1;
              }
            });

            console.log (this.cardex);

            this.database.update_cliente_cardex_ruta (this.cardex, this.cardex.cliente_actual, 'hora_fin_descarga')
              .then (() => {
                this.database.update_cardex_cliente_productos (this.cardex.id, this.cliente_id, this.items)
                  .then (async () => {
                    /*  Despues de actualizar la lista de produtos del cliente, necesitamos
                    *  saber que cual es el siguiente cliente ya
                    *  empezar a escanear la nueva ruta cuando el modal salga
                    */

                    let clientes = await this.database.get_clientes_by_cardex (this.picking_id).pipe (first ()).toPromise ();
                    console.log ('clientes', clientes);

                    let cliente_siguiente = clientes [this.cardex.cliente_actual.orden + 1];
                    console.log ('cliente_siguiente', cliente_siguiente);

                    if (cliente_siguiente !== null && cliente_siguiente !== undefined) {
                      this.cardex.cliente_actual.id = cliente_siguiente.id;
                      this.cardex.cliente_actual.nombre = cliente_siguiente.cliente_nombre;
                      this.cardex.cliente_actual.orden = cliente_siguiente.orden;

                      console.log (this.cardex);

                      this.database.update_cardex (this.cardex)
                        .then (async () => {
                          await loading.dismiss ();
                          this.modalCtrl.dismiss (null, 'ok');
                        }).catch (async (error: any) => {
                          console.log (error);
                          await loading.dismiss ();
                        });
                    } else {
                      if (this.cardex.numero_total_rechazos_totales > 0 || this.cardex.numero_total_rechazos_parciales > 0) {
                        this.cardex.estado = 'camino_almacen';
                      } else {
                        this.cardex.estado = 'fin_ruta';
                      }

                      this.database.update_cardex (this.cardex)
                        .then (async () => {
                          await loading.dismiss ();
                          this.modalCtrl.dismiss (null, 'ok');
                        }).catch (async (error: any) => {
                          console.log (error);
                          await loading.dismiss ();
                        });
                    }
                  }).catch ((error: any) => {
                    console.log (error);
                  });
              })
              .catch ((error: any) => {
                console.log (error);
              });
          }
        }
      ]
    });

    await alert.present ();
  }

  close_modal () {
    this.modalCtrl.dismiss (null);
  }

  async alert_devolucion (producto: any, typo: string) {
    let modal = await this.modalCtrl.create({
      component: AlertProductoPage,
      cssClass: 'modal-alert ',
      componentProps: {
        tipo: typo,
        producto: producto
      }
    });

    modal.onDidDismiss ().then (async (response: any) => {
      if (response.role === 'ok') {
        console.log (response);

        producto.estado = response.data.tipo;
        producto.rechazo_motivo = response.data.motivo
        producto.rechazo_cantidad = response.data.cantidad;
      } else if (response.role === 'clear') {
        producto.estado = '';
        producto.rechazo_motivo = '';
        producto.rechazo_cantidad = 0;
      }
    });

    await modal.present();
  }

  async eliminar (producto: any) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Albums',
      subHeader: '',
      mode: 'md',
      buttons: [{
        text: 'Devolucion partical',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          this.alert_devolucion (producto, 'rechazado_parcial');
        }
      }, {
        text: 'Devolucion total',
        role: 'destructive',
        icon: 'trash',
        handler: () => {
          this.alert_devolucion (producto, 'rechazado_total');
        }
      }, {
        text: 'Cancelar',
        icon: 'close',
        role: 'cancel',
        handler: () => {
          console.log('Cancel clicked');
        }
      }]
    });

    await actionSheet.present();

    // if (producto.estado === 'rechazado_parcial') {
    //   const alert = await this.alertController.create({
    //     header: 'Editar Rechazo Parcial',
    //     inputs: [
    //       {
    //         name: 'motivo',
    //         type: 'text',
    //         placeholder: 'Motivo',
    //         value: producto.rechazo_motivo
    //       }, {
    //         name: 'cantidad',
    //         type: 'number',
    //         placeholder: 'Cantidad',
    //         value: producto.rechazo_cantidad
    //       }
    //     ],
    //     buttons: [
    //       {
    //         text: 'Eliminar rechazo',
    //         role: 'cancel',
    //         cssClass: 'danger',
    //         handler: () => {
    //           producto.estado = '';
    //           producto.rechazo_motivo = '';
    //           producto.rechazo_cantidad = '';
    //         }
    //       },
    //       {
    //         text: 'Actualizar',
    //         handler: async (data: any) => {
    //           if (data.cantidad > producto.cantidad) {
    //             const toast = await this.toastController.create({
    //               message: 'La cantidad ingresada es mayor a cantidad del producto solicitado',
    //               duration: 2000,
    //               position: 'top'
    //             });
    //             toast.present();

    //             this.alert_devolucion (producto, 'parcial');
    //           } else {
    //             producto.estado = 'rechazado_parcial';
    //             producto.rechazo_motivo = data.motivo
    //             producto.rechazo_cantidad = data.cantidad;
    //           }
    //         }
    //       }, {
    //         text: 'Atras',
    //         role: 'cancel',
    //         handler: () => {
    //           console.log('Confirm Cancel');
    //         }
    //       }
    //     ]
    //   });

    //   await alert.present();
    // } else if (producto.estado === 'rechazado_total') {
    //   const alert = await this.alertController.create({
    //     header: 'Editar Rechazo Total',
    //     inputs: [
    //       {
    //         name: 'motivo',
    //         type: 'text',
    //         placeholder: 'Motivo',
    //         value: producto.rechazo_motivo
    //       }
    //     ],
    //     buttons: [
    //       {
    //         text: 'Eliminar rechazo',
    //         role: 'cancel',
    //         cssClass: 'danger',
    //         handler: () => {
    //           producto.estado = '';
    //           producto.rechazo_motivo = '';
    //           producto.rechazo_cantidad = '';
    //         }
    //       },
    //       {
    //         text: 'Actualizar',
    //         handler: async (data: any) => {
    //           producto.estado = 'rechazado_parcial';
    //           producto.rechazo_motivo = data.motivo
    //           producto.rechazo_cantidad = data.cantidad;
    //         }
    //       }, {
    //         text: 'Atras',
    //         role: 'cancel',
    //         handler: () => {
    //           console.log('Confirm Cancel');
    //         }
    //       }
    //     ]
    //   });

    //   await alert.present();
    // } else {
      
    // }
  }

  get_hora () {
    return moment ().format ('LT');
  }

  get_fecha () {
    return moment ().format ('LL');
  }
}

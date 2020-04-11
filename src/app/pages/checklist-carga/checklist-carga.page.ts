import { Component, OnInit } from '@angular/core';

// Services
import { DatabaseService } from '../../services/database.service';
import { AlertController, NavController, LoadingController } from '@ionic/angular';
import { CallService } from '../../services/call.service';

// Param
import { ActivatedRoute } from '@angular/router';

import * as moment from 'moment';

@Component({
  selector: 'app-checklist-carga',
  templateUrl: './checklist-carga.page.html',
  styleUrls: ['./checklist-carga.page.scss'],
})
export class ChecklistCargaPage implements OnInit {
  item: any = null;
  productos: any [] = [];
  constructor (
    private database: DatabaseService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private navCtrl: NavController,
    private phone_service: CallService,
    private loadingController: LoadingController
  ) { }

  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Obteniendo lista de productos...',
    });

    await loading.present ();

    this.database.get_cardex_by_id (this.route.snapshot.paramMap.get ('id')).subscribe ((res: any) => {
      console.log (res);
      this.item = res;

      this.database.get_productos_by_cardex (this.route.snapshot.paramMap.get ('id')).subscribe (async (res: any) => {
        this.productos = res;
        console.log (res);
        await loading.dismiss ();
      });
    });
  }

  get_hora () {
    return moment ().format ('LT');
  }

  get_fecha () {
    return moment ().format ('LL');
  }

  async finalizar_descarga () {
    if (this.item !== null || this.item !== undefined) {
      const alert = await this.alertController.create({
        header: 'Confirm!',
        message: 'Message <strong>text</strong>!!!',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
            handler: (blah) => {
              console.log('Confirm Cancel: blah');
            }
          }, {
            text: 'Okay',
            handler: async () => {
              const loading = await this.loadingController.create({
                message: 'Obteniendo lista de productos...',
              });

              await loading.present ();

              this.database.update_cardex_ruta (this.item, 'hora_fin_carga')
                .then (() => {
                  loading.dismiss ();
                  this.navCtrl.navigateForward (['inicio-ruta', this.item.id]);
                })
                .catch ((error: any) => {
                  loading.dismiss ();
                  console.log (error);
                });
            }
          }
        ]
      });

      await alert.present ();
    }
  }

  check_disbled_button () {
    let cantidad: number = 0;

      this.productos.forEach ((producto: any) => {
        if (producto.checked === true) {
          cantidad++;
        }
      });

      if (cantidad >= this.productos.length) {
        return false;
      } else {
        return true;
      }
  }

  call () {
    this.phone_service.llamar ();
  }
}

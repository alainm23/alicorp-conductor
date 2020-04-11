import { Component, OnInit } from '@angular/core';

// Services
import { DatabaseService } from '../../services/database.service';
import { AlertController, NavController, LoadingController } from '@ionic/angular';
import * as moment from 'moment';
import { CallService } from '../../services/call.service';

// Param
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-inicio-ruta',
  templateUrl: './inicio-ruta.page.html',
  styleUrls: ['./inicio-ruta.page.scss'],
})
export class InicioRutaPage implements OnInit {
  item: any = null;
  constructor (
    private database: DatabaseService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private navCtrl: NavController,
    private phone_service: CallService,
    private loadingController: LoadingController
  ) { }

  call () {
    this.phone_service.llamar ();
  }
  
  async ngOnInit () {
    const loading = await this.loadingController.create({
      message: 'Procesando información...',
    });

    await loading.present ();

    this.database.get_cardex_by_id (this.route.snapshot.paramMap.get ('id')).subscribe (async (res: any) => {
      console.log (res);
      this.item = res;
      await loading.dismiss ();
    });
  }

  async inciar_ruta () {
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
                message: 'Procesando información...',
              });

              await loading.present ();

              this.database.update_cardex_ruta (this.item, 'hora_inicio_ruta')
                .then (() => {
                  loading.dismiss ();
                  this.navCtrl.navigateForward (['cardex', this.item.id]);
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

  get_hora () {
    return moment ().format ('LT');
  }

  get_fecha () {
    return moment ().format ('LL');
  }
}

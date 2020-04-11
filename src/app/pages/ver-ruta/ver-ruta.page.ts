import { Component, OnInit } from '@angular/core';

// Services
import { DatabaseService } from '../../services/database.service';
import { AlertController, NavController, LoadingController } from '@ionic/angular';
import * as moment from 'moment';
import { CallService } from '../../services/call.service';

// Param
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-ver-ruta',
  templateUrl: './ver-ruta.page.html',
  styleUrls: ['./ver-ruta.page.scss'],
})
export class VerRutaPage implements OnInit {
  item: any = null;
  clientes: any [] = [];
  constructor (
    private database: DatabaseService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private phone_service: CallService
  ) { }

  call () {
    this.phone_service.llamar ();
  }
  
  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Obteniendo lista de clientes...',
    });

    await loading.present ();

    this.database.get_cardex_by_id (this.route.snapshot.paramMap.get ('id')).subscribe ((res: any) => {
      console.log (res);
      this.item = res;

      this.database.get_clientes_by_cardex (this.route.snapshot.paramMap.get ('id')).subscribe (async (res: any []) => {
        this.clientes = res;
        await loading.dismiss ();
      })
    });
  }

  async iniciar_carga () {
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
                message: 'Obteniendo lista de clientes...',
              });

              await loading.present ();

              this.database.update_cardex_ruta (this.item, 'hora_inicio_carga')
                .then (() => {
                  loading.dismiss ();
                  this.navCtrl.navigateForward (['checklist-carga', this.item.id]);
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

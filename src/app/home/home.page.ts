import { Component, OnInit } from '@angular/core';

// Services
import { AuthService } from '../services/auth.service';
import { DatabaseService } from '../services/database.service';
import { NavController, LoadingController, ModalController, AlertController } from '@ionic/angular';
import * as moment from 'moment';
import { CallService } from '../services/call.service';
import { AngularFirestore } from '@angular/fire/firestore'
import * as moment from 'moment';

// Modals
import { CargaGasolinaPage } from '../modals/carga-gasolina/carga-gasolina.page';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  items: any [] = [];
  constructor (
      private auth: AuthService,
      private database: DatabaseService,
      private navCtrl: NavController,
      private loadingController: LoadingController,
      private modalController: ModalController,
      private phone_service: CallService,
      private afs: AngularFirestore,
      private alertController: AlertController
  ) {
  }

  call () {
    this.phone_service.llamar ();
  }
  
  async ngOnInit() {
    const loading = await this.loadingController.create({
      message: 'Obteniendo rutas para el dia de hoy...',
    });

    await loading.present ();

    let usuario: any = await this.auth.isLogin ();

    this.database.get_cardex_por_fechaconductor (usuario.uid, moment ().format ("DD[-]MM[-]YYYY")).subscribe ((res: any) => {
      console.log (res);
      this.items = res;
      loading.dismiss ();
    });
  }

  ver_picking (item: any) {
    if (item.estado == 'asignado') {
      this.navCtrl.navigateForward (['ver-ruta', item.id]);
    } else if (item.estado == 'cargando') {
      this.navCtrl.navigateForward (['checklist-carga', item.id]);
    } else if (item.estado == 'fin_de_carga') {
      this.navCtrl.navigateForward (['inicio-ruta', item.id]);
    } else {
      this.navCtrl.navigateForward (['cardex', item.id]);
    }
  }

  get_hora () {
    return moment ().format ('HH:MM A');
  }

  get_fecha () {
    return moment ().format ('LL');
  }

  async open_modal () {
    let modal = await this.modalController.create({
      component: CargaGasolinaPage,
      componentProps: {
        carro_id: ''
      }
    });

    modal.onDidDismiss ().then ((response: any) => {
      if (response.role === 'ok') {

      }
    });

    await modal.present();
  }

  async salir () {
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
            this.auth.signOut ()  
              .then (() => {
                this.navCtrl.navigateRoot ('login');
              })
              .catch ((error: any) => {

              });
          }
        }
      ]
    });

    await alert.present ();
  }
}

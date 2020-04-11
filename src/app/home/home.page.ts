import { Component, OnInit } from '@angular/core';

// Services
import { AuthService } from '../services/auth.service';
import { DatabaseService } from '../services/database.service';
import { NavController, LoadingController, ModalController } from '@ionic/angular';
import * as moment from 'moment';
import { CallService } from '../services/call.service';

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
      private phone_service: CallService
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

    this.database.get_cardex_por_fecha ('23-03-2020').subscribe ((res: any) => {
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
}

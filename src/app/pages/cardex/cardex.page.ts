import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

// Services
import { DatabaseService } from '../../services/database.service';
import { AlertController, NavController, ActionSheetController, ModalController, LoadingController } from '@ionic/angular';
declare var google: any;
import { Geolocation } from '@ionic-native/geolocation/ngx';

// Param
import { ActivatedRoute } from '@angular/router';

// Modals
import { ChecklistProductoClientePage } from '../../modals/checklist-producto-cliente/checklist-producto-cliente.page';
import { AlmuerzoPage } from '../../modals/almuerzo/almuerzo.page';
import { CargaGasolinaPage } from '../../modals/carga-gasolina/carga-gasolina.page';
import { CallService } from '../../services/call.service';

// Utils
import { first } from 'rxjs/operators';
import * as moment from 'moment';

@Component({
  selector: 'app-cardex',
  templateUrl: './cardex.page.html',
  styleUrls: ['./cardex.page.scss'],
})
export class CardexPage implements OnInit {
  @ViewChild('map', { static: false }) mapRef: ElementRef;
  map: any;
  directionsService: any;
  directionsDisplay: any;

  checklist_modal: any = null;
  almuerzo_disponible: any = null;
  item: any;
  clientes: any [] = [];
  cliente_actual: any;

  botton_accion: any = {
    text: '',
    accion: ''
  };
  constructor (
    private database: DatabaseService,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private geolocation: Geolocation,
    private phone_service: CallService,
  ) { }

  call () {
    this.phone_service.llamar ();
  }

  async ngOnInit() {
    // Verificando ruta
    this.check_ruta ();

    // Creando mapa
    setTimeout (() => {
      this.init_map ();
    }, 500);
  }

  async init_map () {
    this.geolocation.getCurrentPosition().then(async (resp) => {
      let clientes: any [] = await this.database.get_clientes_by_cardex (this.route.snapshot.paramMap.get ('id')).pipe (first ()).toPromise ();
      console.log ('Clientes', clientes);

      // Agregar aqui las cordenadas exactas del almacen
      let point_inicio = new google.maps.LatLng (-13.528726, -71.940001);

      let infowindow = new google.maps.InfoWindow ();

      this.directionsService = new google.maps.DirectionsService;
      this.directionsDisplay = new google.maps.DirectionsRenderer({
        suppressPolylines: true,
        suppressMarkers: true,
        infoWindow: infowindow
      });

      const options = {
        center: point_inicio,
        zoom: 15,
        disableDefaultUI: true,
        streetViewControl: false,
        disableDoubleClickZoom: false,
        clickableIcons: false,
        scaleControl: true,
        mapTypeId: 'roadmap'
      }

      this.map = new google.maps.Map (this.mapRef.nativeElement, options);
      this.directionsDisplay.setMap (this.map);

      let waypoints: any [] = [];
      clientes.forEach ((cliente: any) => {
        waypoints.push ({
          location: new google.maps.LatLng (cliente.latitud, cliente.longitud),
          stopover: true
        });
      });
      
      let request = {
        origin: point_inicio,
        destination: waypoints [waypoints.length - 1].location,
        waypoints: waypoints,
        optimizeWaypoints: false,
        provideRouteAlternatives: true,
        travelMode: google.maps.TravelMode ['DRIVING']
      }

      this.directionsService.route (request, (response: any, status: any) => {
        if (status == 'OK') {
          this.directionsDisplay.setOptions({
            directions: response,
          });

          let polylineOptions = {
            strokeColor: '#C83939',
            strokeOpacity: 1,
            strokeWeight: 4
          };
          let colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];
          let polylines = [];

          var bounds = new google.maps.LatLngBounds();
          for (var i = 0; i < polylines.length; i++) {
            polylines[i].setMap(null);
          }
          var legs = response.routes[0].legs;
          for (let i = 0; i < legs.length; i++) {
            var steps = legs[i].steps;
            for (let j = 0; j < steps.length; j++) {
              var nextSegment = steps[j].path;
              var stepPolyline = new google.maps.Polyline(polylineOptions);
              stepPolyline.setOptions({
                strokeColor: colors[i]
              })
              for (let k = 0; k < nextSegment.length; k++) {
                stepPolyline.getPath().push(nextSegment[k]);
                bounds.extend(nextSegment[k]);
              }
              polylines.push(stepPolyline);
              stepPolyline.setMap(this.map);
              // route click listeners, different one on each step
              google.maps.event.addListener(stepPolyline, 'click', (evt: any) => {
                infowindow.setContent("you clicked on the route<br>" + evt.latLng.toUrlValue(6));
                infowindow.setPosition(evt.latLng);
                infowindow.open(this.map);
              });
            }
          }

          this.map.fitBounds (bounds);

          let marker = new google.maps.Marker({
            position: point_inicio,
            icon: 'assets/img/icono almacen.png',
            map: this.map
          });

          let carro_marker = new google.maps.Marker({
            position: new google.maps.LatLng (resp.coords.latitude, resp.coords.longitude),
            icon: 'assets/img/Icono carro.png',
            map: this.map
          });

          let count: number = 1;
          clientes.forEach ((cliente: any) => {
            let marker = new google.maps.Marker({
              position: new google.maps.LatLng (cliente.latitud, cliente.longitud),
              label: { 
                text: count.toString (),
                color: "white",
                fontWeight: 'bold',
                fontSize: '16px'
              },
              map: this.map
            });

            marker.addListener ('click', async (data: any) => {
              console.log (cliente);
              console.log (data.latLng.lat ());
              console.log (data.latLng.lng ());

              const alert = await this.alertController.create({
                header: cliente.cliente_nombre,
                subHeader: cliente.cliente_direccion,
                buttons: ['OK']
              });
          
              await alert.present();
            });

            count++;
          });
        }
      });
     }).catch((error) => {
       console.log('Error getting location', error);
     });
  }

  async check_ruta () {
    const loading = await this.loadingController.create({
      message: 'Verificando ruta...',
    });

    await loading.present ();
    this.item = await this.database.get_cardex_by_id (this.route.snapshot.paramMap.get ('id')).pipe (first ()).toPromise ();
    this.almuerzo_disponible = await this.database.almuerzo_disponible (this.item.conductor_id, moment ().format ('DD[-]MM[-]YYYY')).pipe (first ()).toPromise ();
    await loading.dismiss ();

    if (this.item.cliente_actual === null || this.item.cliente_actual === undefined) {
      if (this.item.estado === 'camino_almacen') {
        this.botton_accion.text = 'LLegada al almacen'
        this.botton_accion.accion = 'hora_llegada_almacen';
      } else if (this.item.estado === 'fin_ruta') {
        this.botton_accion.text = 'Fin de ruta'
        this.botton_accion.accion = 'hora_fin_ruta';
      } else if (this.item.estado === 'finalizado') {
        this.botton_accion.text = 'Ruta finalzada'
        this.botton_accion.accion = '';
      }
    } else if (this.item.estado === 'fin_ruta') {
      this.botton_accion.text = 'LLegada al almacen'
      this.botton_accion.accion = 'hora_llegada_almacen';
    } else {
      if (this.item.estado === 'almuerzo' || this.item.estado === 'fallo_mecanico' || this.item.estado === 'accidente') {
        this.open_evento_modal (this.item.evento_actual);
      } else {
        const loading = await this.loadingController.create({
          message: 'Obteniendo infomacion del cliente actual...',
        });

        await loading.present ();

        this.cliente_actual = await this.database.get_cliente_by_cardex (this.item, this.item.cliente_actual.id).pipe (first ()).toPromise ();

        await loading.dismiss ();

        if (this.cliente_actual.estado === 'asignado') {
          this.botton_accion.text = 'Confirmar llegada'
          this.botton_accion.accion = 'hora_llegada';
        } else if (this.cliente_actual.estado === 'llego') {
          this.botton_accion.text = 'Opciones >'
          this.botton_accion.accion = 'hora_inicio_descarga';
        } else if (this.cliente_actual.estado === 'descargando') {
          this.open_checklist_modal ();
        }
      }
    }
  }

  async open_checklist_modal () {
    this.checklist_modal = await this.modalController.create({
      component: ChecklistProductoClientePage,
      componentProps: {
        picking_id: this.item.id,
        cliente_id: this.cliente_actual.id
      }
    });

    this.checklist_modal.onDidDismiss ().then ((response: any) => {
      if (response.role === 'ok') {
        this.check_ruta ();
      }
    });

    await this.checklist_modal.present();
  }

  async accion () {
    if (this.botton_accion.accion === 'hora_inicio_descarga') {
      const actionSheet = await this.actionSheetController.create({
        header: 'Operaciones',
        subHeader: '',
        mode: 'md',
        buttons: [{
          text: 'Iniciar descarga',
          role: 'destructive',
          icon: 'trash',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Actualizando informacion ...',
            });

            await loading.present ();

            this.database.update_cliente_cardex_ruta (this.item, this.cliente_actual, this.botton_accion.accion)
              .then (async () => {
                await loading.dismiss ();
                this.open_checklist_modal ();
              })
              .catch (async (error: any) => {
                await loading.dismiss ();
                console.log (error);
              });
          }
        }, {
          text: 'Notificar ausensia',
          role: 'destructive',
          icon: 'trash',
          handler: () => {
            this.send_alert_notification ('hora_ausencia');
          }
        }, {
          text: 'Notificar rechazo total',
          role: 'destructive',
          icon: 'trash',
          handler: () => {
            this.send_alert_notification ('hora_rechazo_total');
          }
        }, {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }]
      });

      await actionSheet.present();
    } else {
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
                message: 'Actualizando informacion ...',
              });

              await loading.present ();

              console.log (this.item);
              console.log (this.cliente_actual);

              this.database.update_cliente_cardex_ruta (this.item, this.cliente_actual, this.botton_accion.accion)
                .then (async () => {
                  await loading.dismiss ();
                  this.check_ruta ();
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
  }

  async send_alert_notification (action: string) {
    const loading = await this.loadingController.create({
      message: 'Actualizando informacion ...',
    });

    await loading.present ();

    this.database.update_cliente_cardex_ruta (this.item, this.cliente_actual, action)
      .then (async () => {
        await loading.dismiss ();
        this.check_ruta ();
      })
      .catch (async (error: any) => {
        await loading.dismiss ();
        console.log (error);
      });
  }

  async eventos () {
    const actionSheet = await this.actionSheetController.create({
      header: 'Eventos de retraso',
      // subHeader: '¿Que evento desea registrar?',
      mode: 'md',
      buttons: [{
        text: 'Almuerzo',
        icon: 'restaurant',
        handler: async () => {
          if (this.almuerzo_disponible === null || this.almuerzo_disponible === undefined) {
            this.agregar_evento ('almuerzo');
          } else {
            const alert = await this.alertController.create({
              header: 'Alert',
              subHeader: 'Subtitle',
              message: 'This is an alert message.',
              buttons: ['OK']
            });
        
            await alert.present();
          }
        }
      }, {
        text: 'Falla mecanica',
        icon: 'build',
        handler: async () => {
          this.agregar_evento ('fallo_mecanico');
        }
      }, {
        text: 'Accidente',
        icon: 'car',
        handler: () => {
          this.agregar_evento ('accidente');
        }
      }, {
        text: 'Recarga de combustible',
        icon: 'car',
        handler: () => {
          this.recarga_combustible_modal ();
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
  }

  async recarga_combustible_modal () {
    let modal = await this.modalController.create({
      component: CargaGasolinaPage,
      componentProps: {
        carro_id: this.item.vehiculo_id
      }
    });

    modal.onDidDismiss ().then ((response: any) => {
      if (response.role === 'ok') {

      }
    });

    await modal.present();
  }

  async agregar_evento (tipo: string) {
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
              message: 'Registrando hora de almuerzo...',
            });

            await loading.present ();

            let _nombre = ""
            if (tipo === 'almuerzo') {
              _nombre = "Almuerzo";
            } else if (tipo === 'fallo_mecanico') {
              _nombre = "Fallo mecanico";
            } else if (tipo === 'accidente') {
              _nombre = "Accidente";
            }

            let evento: any = {
              id: this.database.createId (),
              nombre: _nombre,
              tipo: tipo,
              conductor_id: this.item.conductor_id,
              vehiculo_id: this.item.vehiculo_id,
              hora_inicio: moment().format('HH[:]mm'),
              hora_fin: null
            };

            this.database.add_cardex_event (this.item, evento)
              .then (() => {
                loading.dismiss ();
                this.open_evento_modal (evento);
              }).catch ((error: any) => {
                console.log (error);
                loading.dismiss ();
              });
          }
        }
      ]
    });

    await alert.present ();
  }

  async open_evento_modal (evento: any) {
    let modal = await this.modalController.create({
      component: AlmuerzoPage,
      cssClass: 'modal-transparent',
      componentProps: {
        tipo: evento.tipo,
        evento: evento
      }
    });

    modal.onDidDismiss ().then (async (response: any) => {
      if (response.role === 'ok') {
        const loading = await this.loadingController.create({
          message: 'Actualizando informacion ...',
        });

        await loading.present ();

        console.log (response);

        this.database.finalizar_evento_cardex (this.item, response.data)
          .then (() => {
            loading.dismiss ();
            this.check_ruta ();
          })
          .catch ((error: any) => {
            loading.dismiss ();
            this.check_ruta ();
            console.log (error);
          });
      }
    });

    await modal.present();
  }
}

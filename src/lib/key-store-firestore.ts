import type {
	Firestore,
	FirestoreDataConverter,
	CollectionReference,
	QueryDocumentSnapshot,
} from 'firebase-admin/firestore'
import type { KeyInfo, KeyInfoData } from './key-info'
import type { KeyStore } from './key-store'

const keyInfoConverter: FirestoreDataConverter<KeyInfo> = {
	toFirestore: (info) => {
		const { hash, ...data } = info
		return data
	},

	fromFirestore: (snapshot: QueryDocumentSnapshot) => {
		const data = snapshot.data()
		const expires = data.expires ? data.expires.toDate() : null
		return { hash: snapshot.id, ...data, expires } as KeyInfo
	},
}

export class FirestoreKeyStore implements KeyStore {
	private readonly collection: CollectionReference<KeyInfo, FirebaseFirestore.DocumentData>

	constructor(
		private readonly firestore: Firestore,
		private readonly name = 'api',
	) {
		this.collection = this.firestore.collection(this.name).withConverter(keyInfoConverter)
	}

	async put(hash: string, info: KeyInfoData) {
		await this.collection.doc(hash).set({ hash, ...info })
	}

	async get(hash: string) {
		const snap = await this.collection.doc(hash).get()
		return snap.data() || null
	}

	async del(hash: string) {
		await this.collection.doc(hash).delete()
	}

	async list(user: string) {
		const snap = await this.collection.where('user', '==', user).get()
		return snap.docs.map((doc) => doc.data())
	}
}

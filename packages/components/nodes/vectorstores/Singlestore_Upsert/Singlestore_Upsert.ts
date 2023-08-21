import { INode, INodeData, INodeOutputsValue, INodeParams } from '../../../src/Interface'
import { Embeddings } from 'langchain/embeddings/base'
import { Document } from 'langchain/document'
import { getBaseClasses } from '../../../src/utils'
import { SingleStoreVectorStore, SingleStoreVectorStoreConfig } from 'langchain/vectorstores/singlestore'
import { flatten } from 'lodash'

class SingleStoreUpsert_VectorStores implements INode {
    label: string
    name: string
    description: string
    type: string
    icon: string
    category: string
    baseClasses: string[]
    inputs: INodeParams[]
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'SingleStore Upsert Document'
        this.name = 'singlestoreUpsert'
        this.type = 'SingleStore'
        this.icon = 'singlestore.svg'
        this.category = 'Vector Stores'
        this.description = 'Upsert documents to SingleStore'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Host',
                name: 'host',
                type: 'string'
            },
            {
                label: 'User',
                name: 'user',
                type: 'string'
            },
            {
                label: 'Password',
                name: 'password',
                type: 'password'
            },
            {
                label: 'Database',
                name: 'database',
                type: 'string'
            },
            {
                label: 'Table Name',
                name: 'tableName',
                type: 'string',
                placeholder: 'embeddings',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Content Column Name',
                name: 'contentColumnName',
                type: 'string',
                placeholder: 'content',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Vector Column Name',
                name: 'vectorColumnName',
                type: 'string',
                placeholder: 'vector',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Metadata Column Name',
                name: 'metadataColumnName',
                type: 'string',
                placeholder: 'metadata',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'SingleStore Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'SingleStore Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(SingleStoreVectorStore)]
            }
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const singleStoreConnectionConfig = {
            connectionOptions: {
                host: nodeData.inputs?.host as string,
                port: 3306,
                user: nodeData.inputs?.user as string,
                password: nodeData.inputs?.password as string,
                database: nodeData.inputs?.database as string,
                connectAttributes: {
                    program_name: 'flowise'
                }
            },
            ...(nodeData.inputs?.tableName ? { tableName: nodeData.inputs.tableName as string } : {}),
            ...(nodeData.inputs?.contentColumnName ? { contentColumnName: nodeData.inputs.contentColumnName as string } : {}),
            ...(nodeData.inputs?.vectorColumnName ? { vectorColumnName: nodeData.inputs.vectorColumnName as string } : {}),
            ...(nodeData.inputs?.metadataColumnName ? { metadataColumnName: nodeData.inputs.metadataColumnName as string } : {})
        } as SingleStoreVectorStoreConfig

        const docs = nodeData.inputs?.document as Document[]
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const output = nodeData.outputs?.output as string
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseInt(topK, 10) : 4

        const flattenDocs = docs && docs.length ? flatten(docs) : []
        const finalDocs = []
        for (let i = 0; i < flattenDocs.length; i += 1) {
            finalDocs.push(new Document(flattenDocs[i]))
        }

        let vectorStore: SingleStoreVectorStore

        vectorStore = new SingleStoreVectorStore(embeddings, singleStoreConnectionConfig)
        vectorStore.addDocuments.bind(vectorStore)(finalDocs)

        if (output === 'retriever') {
            const retriever = vectorStore.asRetriever(k)
            return retriever
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

module.exports = { nodeClass: SingleStoreUpsert_VectorStores }
